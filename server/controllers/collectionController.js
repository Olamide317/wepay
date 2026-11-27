const mongoose = require('mongoose');
const Collection = require('../models/Collection');

const buildUniqueSlug = async (title) => {
  const base =
    title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'collection';

  let slug;
  let exists = true;
  while (exists) {
    const suffix = Math.random().toString(36).substring(2, 6);
    slug = `${base}-${suffix}`;
    exists = await Collection.exists({ slug });
  }
  return slug;
};

exports.createCollection = async (req, res) => {
  try {
    const {
      title,
      description,
      type,
      mode,
      pricingRule,
      amount,
      targetAmount,
      totalTarget,
      perPersonAmount,
      stockLimit,
      maxQuantityPerOrder,
      passFeeToPayer,
      customFields,
      expiresAt,
      expectedPayers,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Collection title is required' });
    }

    const resolvedType = ['POOL', 'OPEN', 'INVENTORY'].includes(type)
      ? type
      : mode === 'SPLIT'
      ? 'POOL'
      : 'OPEN';

    const resolvedMode = ['SPLIT', 'FLEXIBLE'].includes(mode)
      ? mode
      : resolvedType === 'POOL'
      ? 'SPLIT'
      : 'FLEXIBLE';

    const resolvedPricingRule = ['FIXED', 'MINIMUM', 'FLEXIBLE'].includes(pricingRule)
      ? pricingRule
      : 'FIXED';

    const numericAmount = Number(amount ?? perPersonAmount ?? 0) || 0;
    const numericStockLimit =
      resolvedType === 'INVENTORY' && stockLimit !== undefined && stockLimit !== null
        ? Math.max(1, Number(stockLimit) || 1)
        : null;

    const numericTarget =
      resolvedType === 'POOL'
        ? Number(targetAmount ?? totalTarget ?? 0) || 0
        : resolvedType === 'INVENTORY' && numericStockLimit
        ? numericAmount * numericStockLimit
        : Number(targetAmount ?? totalTarget ?? numericAmount) || 0;

    let sanitizedPayers = [];
    let computedPerPerson = Number(perPersonAmount ?? numericAmount) || 0;

    if (resolvedMode === 'SPLIT') {
      sanitizedPayers = Array.isArray(expectedPayers)
        ? expectedPayers
            .filter((p) => p && p.name && p.name.trim())
            .map((p) => ({
              name: p.name.trim(),
              contact: p.contact ? p.contact.trim() : '',
              status: 'PENDING',
            }))
        : [];

      if (computedPerPerson <= 0 && numericTarget > 0 && sanitizedPayers.length > 0) {
        computedPerPerson = Math.ceil(numericTarget / sanitizedPayers.length);
      }
    }

    const sanitizedCustomFields = Array.isArray(customFields)
      ? customFields
          .filter((f) => f && f.label && String(f.label).trim())
          .map((f, idx) => ({
            id: f.id || `field_${idx + 1}`,
            label: String(f.label).trim(),
            type: f.type || 'short_text',
            required: Boolean(f.required),
            placeholder: f.placeholder ? String(f.placeholder).trim() : '',
            helpText: f.helpText ? String(f.helpText).trim() : '',
            options: Array.isArray(f.options) ? f.options : [],
            order: typeof f.order === 'number' ? f.order : idx,
          }))
      : [];

    const slug = await buildUniqueSlug(title);

    const collection = await Collection.create({
      organizer: req.user._id,
      title: title.trim(),
      description: description ? String(description).trim() : '',
      slug,
      type: resolvedType,
      mode: resolvedMode,
      pricingRule: resolvedPricingRule,
      amount: numericAmount,
      targetAmount: numericTarget,
      totalTarget: numericTarget,
      perPersonAmount: computedPerPerson,
      stockLimit: numericStockLimit,
      stockSold: 0,
      maxQuantityPerOrder: Math.max(1, Number(maxQuantityPerOrder) || 5),
      passFeeToPayer: passFeeToPayer !== undefined ? Boolean(passFeeToPayer) : true,
      customFields: sanitizedCustomFields,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      expectedPayers: sanitizedPayers,
    });

    return res.status(201).json({ collection });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to create collection', error: error.message });
  }
};

exports.getMyCollections = async (req, res) => {
  try {
    const collections = await Collection.find({ organizer: req.user._id }).sort({ createdAt: -1 });

    const stats = collections.reduce(
      (acc, col) => {
        acc.totalRaised += col.amountRaised || col.totalCollected || 0;
        if (col.status === 'ACTIVE') acc.activeCount += 1;
        return acc;
      },
      { totalRaised: 0, activeCount: 0 }
    );

    return res.status(200).json({ collections, stats });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch collections', error: error.message });
  }
};

exports.getCollectionBySlug = async (req, res) => {
  try {
    const collection = await Collection.findOne({ slug: req.params.slug }).populate(
      'organizer',
      'fullName handle verified'
    );

    if (!collection) {
      return res.status(404).json({ message: 'Collection not found' });
    }

    let recentTransactions = [];
    if (mongoose.models.Transaction) {
      recentTransactions = await mongoose.models.Transaction.find({
        collectionId: collection._id,
        status: 'SUCCESS',
      })
        .sort({ verifiedAt: -1 })
        .limit(15)
        .select('payerName contributorName amount baseAmount totalPaid quantity verifiedAt txnRef');
    }

    return res.status(200).json({ collection, recentTransactions });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to load collection', error: error.message });
  }
};

exports.getCollectionLedger = async (req, res) => {
  try {
    const identifier = req.params.id;
    const query = mongoose.Types.ObjectId.isValid(identifier)
      ? { _id: identifier }
      : { slug: identifier };

    const collection = await Collection.findOne(query);
    if (!collection) {
      return res.status(404).json({ message: 'Collection not found' });
    }

    if (collection.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the organizer can view this ledger' });
    }

    let transactions = [];
    if (mongoose.models.Transaction) {
      transactions = await mongoose.models.Transaction.find({
        collectionId: collection._id,
      }).sort({ createdAt: -1 });
    }

    return res.status(200).json({ collection, transactions });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to load collection ledger', error: error.message });
  }
};

exports.updateCollectionStatus = async (req, res) => {
  try {
    const identifier = req.params.slug;
    const query = mongoose.Types.ObjectId.isValid(identifier)
      ? { _id: identifier }
      : { slug: identifier };

    const collection = await Collection.findOne(query);

    if (!collection) {
      return res.status(404).json({ message: 'Collection not found' });
    }

    if (collection.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the organizer can update this collection' });
    }

    const allowed = ['ACTIVE', 'COMPLETED', 'PAUSED', 'CLOSED'];
    const requested = req.body.status;
    const nextStatus =
      requested && allowed.includes(requested)
        ? requested
        : collection.status === 'ACTIVE'
        ? 'PAUSED'
        : 'ACTIVE';

    collection.status = nextStatus;
    await collection.save();

    return res.status(200).json({ collection });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update status', error: error.message });
  }
};

const parsePromptFallback = (rawPrompt) => {
  const prompt = String(rawPrompt || '').trim();
  const lower = prompt.toLowerCase();

  const isInventory = /\b(pre-?order|preorder|sell|selling|boxes?|packs?|units?|tickets?|manuals?|hoodies?|shirts?|jerseys?|merch|stock|plates?)\b/.test(lower);
  const isPool =
    !isInventory &&
    /\b(split|pool|share|shared|roommates?|friends?|target|starlink|fuel|generator|gift|contribute towards|raise)\b/.test(lower);
  const type = isInventory ? 'INVENTORY' : isPool ? 'POOL' : 'OPEN';

  const amountMatches = [...prompt.matchAll(/(?:₦|ngn|n)?\s*(\d[\d,]*(?:\.\d+)?)\s*(k)?\b/gi)]
    .map((m) => {
      const num = parseFloat(m[1].replace(/,/g, ''));
      const mult = m[2] ? 1000 : 1;
      return { val: Math.round(num * mult), index: m.index || 0, hasCurrency: /₦|ngn|\bk\b/i.test(m[0]) };
    })
    .filter((item) => item.val >= 100 || item.hasCurrency);

  const peopleMatch = lower.match(/\b(?:among|between|for|split by)\s+(\d+)\s*(?:people|friends|roommates|students|members|payers)?\b/);
  const stockMatch = lower.match(/\b(\d+)\s*(?:boxes?|packs?|units?|tickets?|manuals?|hoodies?|shirts?|jerseys?|plates?|slots?|copies)\b/);

  let amount = 2500;
  let targetAmount = undefined;
  let stockLimit = undefined;
  let pricingRule = 'FIXED';

  if (type === 'INVENTORY') {
    pricingRule = 'FIXED';
    stockLimit = stockMatch ? Math.max(1, parseInt(stockMatch[1], 10)) : 25;
    const priceCandidate = amountMatches.find((m) => m.val >= 100 && m.val !== stockLimit);
    amount = priceCandidate ? priceCandidate.val : 2500;
  } else if (type === 'POOL') {
    pricingRule = 'FIXED';
    const biggest = amountMatches.sort((a, b) => b.val - a.val)[0];
    targetAmount = biggest ? biggest.val : 50000;
    const splitCount = peopleMatch ? Math.max(2, parseInt(peopleMatch[1], 10)) : 5;
    amount = Math.max(100, Math.ceil(targetAmount / splitCount));
  } else {
    pricingRule = /\b(minimum|at least|from)\b/.test(lower)
      ? 'MINIMUM'
      : /\b(any amount|flexible|donate|donation|freewill)\b/.test(lower)
      ? 'FLEXIBLE'
      : 'FIXED';
    const priceCandidate = amountMatches[0];
    amount = pricingRule === 'FLEXIBLE' ? 0 : priceCandidate ? priceCandidate.val : 3000;
  }

  const customFields = [];
  if (/\b(hostel|room|hall|lodge|address|location|delivery|pickup)\b/.test(lower)) {
    customFields.push({
      id: `ai_cf_${customFields.length + 1}`,
      label: 'Hostel & Room / Pickup Location',
      type: 'short_text',
      required: true,
      placeholder: 'e.g. Hall 4, Room 203',
    });
  }
  if (/\b(matric|student|department|dept|level|nacos|dues|manual|course)\b/.test(lower)) {
    customFields.push({
      id: `ai_cf_${customFields.length + 1}`,
      label: 'Matric Number',
      type: 'short_text',
      required: true,
      placeholder: 'e.g. 2024008110',
    });
    customFields.push({
      id: `ai_cf_${customFields.length + 1}`,
      label: 'Department & Level',
      type: 'short_text',
      required: true,
      placeholder: 'e.g. Computer Science - 300L',
    });
  }
  if (/\b(size|shirt|hoodie|jersey|merch|wear)\b/.test(lower)) {
    customFields.push({
      id: `ai_cf_${customFields.length + 1}`,
      label: 'Preferred Size',
      type: 'select',
      required: true,
      options: ['S', 'M', 'L', 'XL', 'XXL'],
    });
  }
  if (/\b(flavo?r|choice|option|pack|variant)\b/.test(lower)) {
    customFields.push({
      id: `ai_cf_${customFields.length + 1}`,
      label: 'Preferred Option / Flavor',
      type: 'short_text',
      required: true,
      placeholder: 'Specify your preferred choice',
    });
  }

  const cleanedTitle = prompt
    .replace(/^(create|set up|setup|make|build|start)\s+(a|an|me)?\s*/i, '')
    .replace(/\b(asking for|with fields?|require|requiring)\b.*$/i, '')
    .trim();
  const title =
    cleanedTitle.length >= 4
      ? cleanedTitle.charAt(0).toUpperCase() + cleanedTitle.slice(1, 68)
      : type === 'POOL'
      ? 'Shared Group Expense Pool'
      : type === 'INVENTORY'
      ? 'Limited Pre-Order Drop'
      : 'Group Dues & Contributions';

  const description =
    type === 'POOL'
      ? `Group pool contribution for ${title}. Funds are tracked transparently via Interswitch and close automatically once the ₦${targetAmount.toLocaleString('en-NG')} target is reached.`
      : type === 'INVENTORY'
      ? `Pre-order payment for ${title} (${stockLimit} units available). Complete checkout to receive an instant QR-verified pickup receipt.`
      : `Official contribution link for ${title}. Instant digital receipt issued upon Interswitch payment confirmation.`;

  const passFeeToPayer = !/\b(absorb|no fee|zero fee|free of charge)\b/.test(lower);

  return {
    type,
    title,
    description,
    pricingRule,
    amount,
    targetAmount,
    stockLimit,
    passFeeToPayer,
    customFields,
    engine: 'WePay Smart NLP Engine',
  };
};

exports.generateAiCollectionDraft = async (req, res) => {
  try {
    const { prompt } = req.body || {};
    if (!prompt || String(prompt).trim().length < 5) {
      return res.status(400).json({ message: 'Please enter a short description of what you want to collect.' });
    }

    const fallbackDraft = parsePromptFallback(prompt);

    if (process.env.GEMINI_API_KEY) {
      try {
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(
            process.env.GEMINI_API_KEY
          )}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text: `Convert this Nigerian payment collection prompt into JSON with keys: type ("POOL"|"OPEN"|"INVENTORY"), title (string), description (string), pricingRule ("FIXED"|"MINIMUM"|"FLEXIBLE"), amount (number in NGN), targetAmount (number or null), stockLimit (number or null), passFeeToPayer (boolean), customFields (array of {id, label, type: "short_text"|"select", required: true, options?: string[]}). Prompt: "${String(
                        prompt
                      ).replace(/"/g, "'")}"`,
                    },
                  ],
                },
              ],
              generationConfig: { responseMimeType: 'application/json' },
            }),
          }
        );

        if (geminiRes.ok) {
          const data = await geminiRes.json();
          const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) {
            const parsed = JSON.parse(rawText);
            return res.status(200).json({
              draft: {
                ...fallbackDraft,
                ...parsed,
                engine: 'Gemini AI + WePay Engine',
              },
            });
          }
        }
      } catch {
        // Fall back seamlessly to local NLP parser
      }
    }

    return res.status(200).json({ draft: fallbackDraft });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to generate AI draft', error: error.message });
  }
};