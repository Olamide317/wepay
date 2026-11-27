const crypto = require('crypto');
const Collection = require('../models/Collection');
const Transaction = require('../models/Transaction');

const getIswConfig = () => ({
  merchantCode: process.env.ISW_MERCHANT_CODE || process.env.INTERSWITCH_MERCHANT_CODE || 'MX6072',
  payItemId: process.env.ISW_PAY_ITEM_ID || process.env.INTERSWITCH_PAY_ITEM_ID || '9405967',
  requeryBaseUrl:
    process.env.ISW_REQUERY_URL ||
    'https://qa.interswitchng.com/collections/api/v1/gettransaction.json',
});

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
  if (tx.status === 'SUCCESS') {
    return tx;
  }

  const collection = await Collection.findById(tx.collectionId);
  if (!collection) {
    return tx;
  }

  const qty = Math.max(1, Number(tx.quantity) || 1);
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
          totalCollected: tx.baseAmount,
          amountRaised: tx.baseAmount,
          stockSold: qty,
          contributorCount: 1,
        },
      },
      { new: true }
    );

    if (!updatedCol) {
      tx.status = 'FAILED';
      await tx.save();
      return tx;
    }

    if ((updatedCol.stockSold || 0) >= updatedCol.stockLimit && updatedCol.status === 'ACTIVE') {
      updatedCol.status = 'COMPLETED';
      await updatedCol.save();
    }
  } else {
    updatedCol = await Collection.findByIdAndUpdate(
      collection._id,
      {
        $inc: {
          totalCollected: tx.baseAmount,
          amountRaised: tx.baseAmount,
          contributorCount: 1,
        },
      },
      { new: true }
    );

    const target = updatedCol?.targetAmount || updatedCol?.totalTarget || 0;
    const raised = updatedCol?.amountRaised || updatedCol?.totalCollected || 0;
    if (updatedCol && updatedCol.type === 'POOL' && target > 0 && raised >= target && updatedCol.status === 'ACTIVE') {
      updatedCol.status = 'COMPLETED';
      await updatedCol.save();
    }
  }

  const now = new Date();
  const secret = process.env.JWT_SECRET || 'wepay_receipt_secret';
  const receiptHash = crypto
    .createHash('sha256')
    .update(`${tx.txnRef}:${tx.receiptCode}:${tx.totalPaid}:${secret}`)
    .digest('hex')
    .slice(0, 24);

  tx.status = 'SUCCESS';
  tx.interswitchRef = interswitchRef || `ISW-${Date.now()}`;
  tx.receiptHash = receiptHash;
  tx.paidAt = now;
  tx.verifiedAt = now;
  await tx.save();

  if (updatedCol && Array.isArray(updatedCol.expectedPayers) && updatedCol.expectedPayers.length > 0) {
    const targetName = tx.contributorName.toLowerCase().trim();
    const payerEntry = updatedCol.expectedPayers.find(
      (p) => p.status === 'PENDING' && p.name.toLowerCase().trim() === targetName
    );
    if (payerEntry) {
      payerEntry.status = 'PAID';
      payerEntry.paidAt = now;
      payerEntry.txnRef = tx.txnRef;
      await updatedCol.save();
    }
  }

  return tx;
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

    if (!baseAmount || baseAmount < 100) {
      return res.status(400).json({ message: 'Payment amount must be at least ₦100' });
    }

    const passFeeToPayer =
      collection.passFeeToPayer !== undefined ? Boolean(collection.passFeeToPayer) : true;
    const standardFee = Math.min(Math.round(baseAmount * 0.015) + 50, 2000);
    const feeAmount = passFeeToPayer ? standardFee : 0;
    const totalPaid = baseAmount + feeAmount;

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

    const { merchantCode, payItemId } = getIswConfig();

    const checkoutParams = {
      txnRef,
      amount: totalPaid * 100,
      amountNaira: totalPaid,
      baseAmountNaira: baseAmount,
      feeAmountNaira: feeAmount,
      merchantCode,
      payItemId,
      currency: '566',
      receiptCode,
      isSandboxSimulation: false,
    };

    return res.status(201).json({
      checkoutParams,
      transaction: formatTransactionResponse(tx, collection),
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to initialize payment', error: error.message });
  }
};

exports.verifyPayment = async (req, res) => {
  try {
    const txnRef = req.body.txnRef || req.body.txnref || req.body.transactionreference;
    if (!txnRef) {
      return res.status(400).json({ message: 'Transaction reference (txnRef) is required' });
    }

    const tx = await Transaction.findOne({ txnRef: String(txnRef).trim() });
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
    const amountKobo = tx.totalPaid * 100;
    const url = `${requeryBaseUrl}?merchantcode=${encodeURIComponent(
      merchantCode
    )}&transactionreference=${encodeURIComponent(tx.txnRef)}&amount=${amountKobo}`;

    let iswData = null;
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (response.ok) {
        iswData = await response.json();
      }
    } catch {
      iswData = null;
    }

    const isApproved =
      iswData?.ResponseCode === '00' ||
      (process.env.NODE_ENV !== 'production' && req.body.simulateQaSuccess === true);

    if (isApproved) {
      const ref =
        iswData?.PaymentReference || iswData?.RetrievalReferenceNumber || `ISW-QA-${Date.now()}`;
      await settleTransactionSuccess(tx, ref);
    } else if (iswData && iswData.ResponseCode && iswData.ResponseCode !== '09') {
      tx.status = 'FAILED';
      await tx.save();
    }

    return res.status(200).json({
      transaction: formatTransactionResponse(tx, collection),
      interswitchResponse: iswData,
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

    const tx = await Transaction.findOne({ txnRef: String(txnRef).trim() });
    if (!tx) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    if (tx.status !== 'SUCCESS') {
      const { merchantCode, requeryBaseUrl } = getIswConfig();
      const amountKobo = tx.totalPaid * 100;
      const url = `${requeryBaseUrl}?merchantcode=${encodeURIComponent(
        merchantCode
      )}&transactionreference=${encodeURIComponent(tx.txnRef)}&amount=${amountKobo}`;

      const response = await fetch(url, { method: 'GET' });
      const iswData = response.ok ? await response.json() : null;

      if (iswData?.ResponseCode === '00') {
        const ref =
          iswData.PaymentReference || iswData.RetrievalReferenceNumber || `ISW-WH-${Date.now()}`;
        await settleTransactionSuccess(tx, ref);
      }
    }

    return res.status(200).json({ received: true, status: tx.status });
  } catch (error) {
    return res.status(500).json({ message: 'Webhook processing error', error: error.message });
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