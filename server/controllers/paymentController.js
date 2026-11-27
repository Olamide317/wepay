const crypto = require('crypto');
const mongoose = require('mongoose');
const Collection = require('../models/Collection');
const Transaction = require('../models/Transaction');
const { sendPaymentReceiptEmail } = require('../services/emailService');

const getIswConfig = () => {
  const isLive = (process.env.ISW_MODE || 'LIVE').toUpperCase() === 'LIVE';
  const merchantCode = process.env.ISW_MERCHANT_CODE || 'MX153376';
  const payItemId = process.env.ISW_PAY_ITEM_ID || '9616745';

  return {
    mode: isLive ? 'LIVE' : 'TEST',
    merchantCode,
    payItemId,
    requeryBaseUrl: isLive
      ? 'https://webpay.interswitchng.com/collections/api/v1/gettransaction.json'
      : 'https://qa.interswitchng.com/collections/api/v1/gettransaction.json',
  };
};

const isVerifiedInterswitchPayment = (response, expectedAmountKobo) =>
  response?.ResponseCode === '00' &&
  Number.isFinite(Number(response.Amount)) &&
  Number(response.Amount) === Number(expectedAmountKobo);

const notifyReceiptEmail = (transaction, collection) => {
  if (!transaction.contributorEmail) return;
  void Promise.resolve()
    .then(() =>
      sendPaymentReceiptEmail({
        payerName: transaction.payerName || transaction.contributorName,
        payerEmail: transaction.contributorEmail,
        collectionTitle: collection?.title,
        amountPaid: transaction.totalPaid,
        receiptCode: transaction.receiptCode,
        txnRef: transaction.txnRef,
        quantity: transaction.quantity,
        paidAt: transaction.paidAt,
      })
    )
    .catch((error) => console.error('[Brevo Receipt Error]:', error.message));
};

const formatTransactionResponse = (tx, collection) => ({
  _id: tx._id,
  collectionId: collection?._id || tx.collectionId,
  collectionTitle: collection?.title || 'WePay Collection',
  collectionSlug: collection?.slug || '',
  collectionType: collection?.type || (collection?.mode === 'SPLIT' ? 'POOL' : 'OPEN'),
  txnRef: tx.txnRef,
  contributorName: tx.contributorName,
  contributorEmail: tx.contributorEmail,
  contributorPhone: tx.contributorPhone,
  quantity: tx.quantity || 1,
  baseAmount: tx.baseAmount,
  feeAmount: tx.feeAmount,
  totalPaid: tx.totalPaid,
  customResponses: tx.customResponses || {},
  customFieldAnswers: tx.customFieldAnswers || [],
  receiptCode: tx.receiptCode,
  interswitchRef: tx.interswitchRef || undefined,
  receiptHash: tx.receiptHash || undefined,
  status: tx.status,
  createdAt: tx.createdAt,
  paidAt: tx.paidAt || undefined,
  isSimulated: false,
});

const settleTransactionSuccess = async (tx, interswitchRef) => {
  const session = await mongoose.startSession();
  let settledTransaction = tx;
  let settledCollection = null;
  let newlySettled = false;
  let transactionFailed = false;

  try {
    await session.withTransaction(async () => {
      newlySettled = false;
      settledCollection = null;
      const currentTx = await Transaction.findOne({ txnRef: tx.txnRef }).session(session);
      if (!currentTx || currentTx.status === 'SUCCESS' || currentTx.status === 'FAILED') {
        settledTransaction = currentTx || tx;
        return;
      }

      const collection = await Collection.findById(currentTx.collectionId).session(session);
      if (!collection) {
        settledTransaction = currentTx;
        return;
      }
      settledCollection = collection;

      const qty = Math.max(1, Number(currentTx.quantity) || 1);
      let updatedCol = null;

      if (collection.type === 'INVENTORY' && collection.stockLimit && collection.stockLimit > 0) {
        updatedCol = await Collection.findOneAndUpdate(
          {
            _id: collection._id,
            $expr: {
              $lte: [{ $add: [{ $ifNull: ['$stockSold', 0] }, qty] }, '$stockLimit'],
            },
          },
          {
            $inc: {
              totalCollected: currentTx.baseAmount,
              amountRaised: currentTx.baseAmount,
              stockSold: qty,
              contributorCount: 1,
            },
          },
          { new: true, session }
        );

        if (!updatedCol) {
          currentTx.status = 'FAILED';
          await currentTx.save({ session });
          settledTransaction = currentTx;
          return;
        }

        if ((updatedCol.stockSold || 0) >= updatedCol.stockLimit && updatedCol.status === 'ACTIVE') {
          updatedCol.status = 'COMPLETED';
          await updatedCol.save({ session });
        }
      } else {
        updatedCol = await Collection.findByIdAndUpdate(
          collection._id,
          {
            $inc: {
              totalCollected: currentTx.baseAmount,
              amountRaised: currentTx.baseAmount,
              contributorCount: 1,
            },
          },
          { new: true, session }
        );

        const target = updatedCol?.targetAmount || updatedCol?.totalTarget || 0;
        const raised = updatedCol?.amountRaised || updatedCol?.totalCollected || 0;
        if (
          updatedCol &&
          updatedCol.type === 'POOL' &&
          target > 0 &&
          raised >= target &&
          updatedCol.status === 'ACTIVE'
        ) {
          updatedCol.status = 'COMPLETED';
          await updatedCol.save({ session });
        }
      }

      const now = new Date();
      const secret = process.env.JWT_SECRET || 'wepay_receipt_secret';
      currentTx.status = 'SUCCESS';
      currentTx.interswitchRef = interswitchRef || `ISW-${Date.now()}`;
      currentTx.receiptHash = crypto
        .createHash('sha256')
        .update(`${currentTx.txnRef}:${currentTx.receiptCode}:${currentTx.totalPaid}:${secret}`)
        .digest('hex')
        .slice(0, 24);
      currentTx.paidAt = now;
      currentTx.verifiedAt = now;
      await currentTx.save({ session });
      newlySettled = true;

      if (updatedCol && Array.isArray(updatedCol.expectedPayers) && updatedCol.expectedPayers.length > 0) {
        const targetName = currentTx.contributorName.toLowerCase().trim();
        const payerEntry = updatedCol.expectedPayers.find(
          (payer) => payer.status === 'PENDING' && payer.name.toLowerCase().trim() === targetName
        );
        if (payerEntry) {
          payerEntry.status = 'PAID';
          payerEntry.paidAt = now;
          payerEntry.txnRef = currentTx.txnRef;
          await updatedCol.save({ session });
        }
      }

      settledTransaction = currentTx;
    });

    return {
      transaction: settledTransaction,
      collection: settledCollection,
      newlySettled,
    };
  } catch (error) {
    transactionFailed = true;
    try {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
    } catch (abortError) {
      console.error('Failed to abort payment settlement transaction:', abortError);
    }
    throw error;
  } finally {
    try {
      await session.endSession();
    } catch (endError) {
      if (!transactionFailed) {
        throw endError;
      }
      console.error('Failed to end payment settlement session after transaction failure:', endError);
    }
  }
};

exports.initializePayment = async (req, res) => {
  try {
    const {
      slug,
      contributorName,
      contributorEmail,
      contributorPhone,
      amount,
      quantity,
      customResponses,
      customFieldAnswers,
    } = req.body;

    if (!slug || !contributorName || !contributorName.trim()) {
      return res.status(400).json({ message: 'Collection slug and contributor name are required' });
    }

    const collection = await Collection.findOne({ slug: String(slug).trim() }).populate(
      'organizer',
      'fullName handle'
    );

    if (!collection) {
      return res.status(404).json({ message: 'Collection not found' });
    }

    if (collection.status !== 'ACTIVE') {
      return res.status(400).json({
        message: `This collection is currently ${collection.status.toLowerCase()} and no longer accepting payments`,
      });
    }

    const qty = collection.type === 'INVENTORY' ? Math.max(1, Number(quantity) || 1) : 1;

    if (collection.type === 'INVENTORY' && collection.stockLimit && collection.stockLimit > 0) {
      const remaining = Math.max(0, collection.stockLimit - (collection.stockSold || 0));
      if (remaining < qty) {
        return res.status(400).json({
          message:
            remaining === 0
              ? 'This item is sold out.'
              : `Only ${remaining} unit(s) remaining in stock.`,
        });
      }
    }

    const unitOrBase = Number(collection.amount || collection.perPersonAmount || collection.totalTarget || 0);
    const requestedAmount = Number(amount) || 0;
    const baseAmount =
      collection.type === 'INVENTORY'
        ? unitOrBase * qty
        : requestedAmount > 0
        ? requestedAmount
        : unitOrBase;

    if (!baseAmount || baseAmount < 10) {
      return res.status(400).json({ message: 'Payment amount must be at least ₦10' });
    }

    const passFeeToPayer =
      collection.passFeeToPayer !== undefined ? Boolean(collection.passFeeToPayer) : true;
    const standardFee = Math.min(Math.round(baseAmount * 0.015) + 50, 2000);
    const feeAmount = passFeeToPayer ? standardFee : 0;
    const totalPaid = baseAmount + feeAmount;
    const { merchantCode, payItemId, mode } = getIswConfig();

    const txnRef = `WP-${Date.now()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
    const receiptCode = `RCP-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const cleanName = contributorName.trim();

    const tx = await Transaction.create({
      collectionId: collection._id,
      txnRef,
      receiptCode,
      contributorName: cleanName,
      payerName: cleanName,
      contributorEmail: contributorEmail ? String(contributorEmail).trim() : '',
      contributorPhone: contributorPhone ? String(contributorPhone).trim() : '',
      quantity: qty,
      baseAmount,
      amount: baseAmount,
      feeAmount,
      totalPaid,
      customResponses: customResponses || {},
      customFieldAnswers: Array.isArray(customFieldAnswers) ? customFieldAnswers : [],
      status: 'PENDING',
    });

    const checkoutParams = {
      txnRef,
      amount: Math.round(totalPaid * 100),
      amountNaira: totalPaid,
      baseAmountNaira: baseAmount,
      feeAmountNaira: feeAmount,
      merchantCode,
      payItemId,
      mode,
      currency: '566',
      receiptCode,
      isSandboxSimulation: false,
    };

    return res.status(201).json({
      checkoutParams,
      transaction: formatTransactionResponse(tx, collection),
    });
  } catch (error) {
    if (error.status === 503) {
      return res.status(503).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Failed to initialize payment', error: error.message });
  }
};

exports.verifyPayment = async (req, res) => {
  try {
    const txnRef = req.body.txnRef || req.body.txnref || req.body.transactionreference;
    if (!txnRef) {
      return res.status(400).json({ message: 'Transaction reference (txnRef) is required' });
    }

    let tx = await Transaction.findOne({ txnRef: String(txnRef).trim() });
    if (!tx) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    const collection = await Collection.findById(tx.collectionId).populate(
      'organizer',
      'fullName handle'
    );

    if (tx.status === 'SUCCESS') {
      return res.status(200).json({
        transaction: formatTransactionResponse(tx, collection),
        collection,
      });
    }

    const { merchantCode, requeryBaseUrl } = getIswConfig();
    const amountKobo = Math.round(tx.totalPaid * 100);
    const url = `${requeryBaseUrl}?merchantcode=${encodeURIComponent(
      merchantCode
    )}&transactionreference=${encodeURIComponent(tx.txnRef)}&amount=${amountKobo}`;

    let iswData = null;
    let verificationError;
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (response.ok) {
        iswData = await response.json();
      } else {
        const responseBody = await response.text();
        console.error(
          `Interswitch requery failed with HTTP ${response.status}: ${responseBody || '(empty response body)'}`
        );
        verificationError = `Interswitch requery returned HTTP ${response.status}.`;
      }
    } catch (error) {
      console.error('Interswitch payment requery failed:', error);
      verificationError = 'Unable to reach Interswitch to verify the payment. Please retry.';
    }

    const isApproved = isVerifiedInterswitchPayment(iswData, amountKobo);
    if (
      iswData?.ResponseCode === '00' &&
      !(
        Number.isFinite(Number(iswData.Amount)) &&
        Number(iswData.Amount) === amountKobo
      )
    ) {
      verificationError =
        'Interswitch approved the transaction but returned an amount that does not match the expected amount.';
    }

    if (isApproved) {
      const ref =
        iswData?.PaymentReference || iswData?.RetrievalReferenceNumber || `ISW-QA-${Date.now()}`;
      const settlement = await settleTransactionSuccess(tx, ref);
      tx = settlement.transaction;
      if (settlement.newlySettled) {
        notifyReceiptEmail(tx, settlement.collection);
      }
    } else if (iswData && iswData.ResponseCode && iswData.ResponseCode !== '09') {
      await Transaction.updateOne(
        { _id: tx._id, status: 'PENDING' },
        { $set: { status: 'FAILED' } }
      );
      tx = (await Transaction.findById(tx._id)) || tx;
    }

    return res.status(200).json({
      transaction: formatTransactionResponse(tx, collection),
      interswitchResponse: iswData,
      verificationError,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Payment verification failed', error: error.message });
  }
};

exports.handleWebhook = async (req, res) => {
  try {
    const payload = req.body || {};
    const txnRef =
      payload.txnRef ||
      payload.transactionReference ||
      payload.data?.merchantTransactionReference ||
      payload.merchantTransactionReference;

    if (!txnRef) {
      return res.status(400).json({ message: 'Missing transaction reference in webhook payload' });
    }

    let tx = await Transaction.findOne({ txnRef: String(txnRef).trim() });
    if (!tx) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    if (tx.status !== 'SUCCESS') {
      const { merchantCode, requeryBaseUrl } = getIswConfig();
      const amountKobo = Math.round(tx.totalPaid * 100);
      const url = `${requeryBaseUrl}?merchantcode=${encodeURIComponent(
        merchantCode
      )}&transactionreference=${encodeURIComponent(tx.txnRef)}&amount=${amountKobo}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      let iswData = null;
      if (response.ok) {
        iswData = await response.json();
      } else {
        const responseBody = await response.text();
        console.error(
          `Interswitch webhook requery failed with HTTP ${response.status}: ${responseBody || '(empty response body)'}`
        );
      }

      if (isVerifiedInterswitchPayment(iswData, amountKobo)) {
        const ref =
          iswData.PaymentReference || iswData.RetrievalReferenceNumber || `ISW-WH-${Date.now()}`;
        const settlement = await settleTransactionSuccess(tx, ref);
        tx = settlement.transaction;
        if (settlement.newlySettled) {
          notifyReceiptEmail(tx, settlement.collection);
        }
      }
    }

    return res.status(200).json({ received: true, status: tx.status });
  } catch (error) {
    return res.status(500).json({ message: 'Webhook processing error', error: error.message });
  }
};

exports.handleCheckoutRedirectReturn = async (req, res) => {
  try {
    const txnRef =
      req.body?.txnref ||
      req.body?.txnRef ||
      req.body?.transactionreference ||
      req.query?.txnref ||
      req.query?.txnRef ||
      req.query?.transactionreference;
    if (!txnRef) {
      return res.status(400).send('Missing Interswitch transaction reference.');
    }

    const transaction = await Transaction.findOne({ txnRef: String(txnRef).trim() });
    if (!transaction) {
      return res.status(404).send('Transaction not found.');
    }

    const collection = await Collection.findById(transaction.collectionId).select('slug');
    if (!collection) {
      return res.status(404).send('Collection not found.');
    }

    const configuredClientUrl =
      process.env.CLIENT_URL || 'https://wepay-peach.vercel.app';
    const clientOrigin = configuredClientUrl.split(',')[0].trim().replace(/\/+$/, '');
    const redirectUrl = new URL(`/c/${encodeURIComponent(collection.slug)}`, clientOrigin);
    redirectUrl.searchParams.set('txnref', transaction.txnRef);
    return res.redirect(303, redirectUrl.toString());
  } catch (error) {
    console.error('Interswitch redirect handling failed:', error.message);
    return res.status(500).send('Unable to return to the WePay checkout page.');
  }
};

exports.getReceipt = async (req, res) => {
  try {
    const code = String(req.params.receiptCode || '').trim();
    const tx = await Transaction.findOne({
      $or: [
        { receiptCode: new RegExp(`^${code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
        { txnRef: code },
      ],
    });

    if (!tx) {
      return res.status(404).json({ message: 'Receipt code not found or invalid' });
    }

    const collection = await Collection.findById(tx.collectionId).populate(
      'organizer',
      'fullName handle'
    );

    return res.status(200).json({
      transaction: formatTransactionResponse(tx, collection),
      collection: collection
        ? {
            _id: collection._id,
            slug: collection.slug,
            title: collection.title,
            type: collection.type || (collection.mode === 'SPLIT' ? 'POOL' : 'OPEN'),
            organizerName: collection.organizer?.fullName || 'Organizer',
            organizerHandle: collection.organizer?.handle || 'organizer',
            passFeeToPayer: collection.passFeeToPayer !== undefined ? collection.passFeeToPayer : true,
          }
        : {
            _id: tx.collectionId,
            slug: '',
            title: 'WePay Collection',
            type: 'OPEN',
            organizerName: 'Organizer',
            organizerHandle: 'organizer',
            passFeeToPayer: true,
          },
      isSimulated: false,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to retrieve receipt', error: error.message });
  }
};