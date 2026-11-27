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
    const { title, description, mode, totalTarget, perPersonAmount, expectedPayers } = req.body;

    if (!title || !['SPLIT', 'FLEXIBLE'].includes(mode)) {
      return res.status(400).json({ message: 'Valid title and mode (SPLIT or FLEXIBLE) are required' });
    }

    const numericTarget = Number(totalTarget) || 0;
    let sanitizedPayers = [];
    let computedPerPerson = Number(perPersonAmount) || 0;

    if (mode === 'SPLIT') {
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

    const slug = await buildUniqueSlug(title);

    const collection = await Collection.create({
      organizer: req.user._id,
      title,
      description: description || '',
      slug,
      mode,
      totalTarget: numericTarget,
      perPersonAmount: computedPerPerson,
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
        acc.totalRaised += col.totalCollected || 0;
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
    const collection = await Collection.findOne({ slug: req.params.slug }).populate('organizer', 'fullName handle verified');

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
        .select('payerName contributorName amount baseAmount totalPaid note verifiedAt txnRef');
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

    const requested = req.body.status === 'PAUSED' ? 'CLOSED' : req.body.status;
    const nextStatus =
      requested && ['ACTIVE', 'CLOSED'].includes(requested)
        ? requested
        : collection.status === 'ACTIVE'
        ? 'CLOSED'
        : 'ACTIVE';

    collection.status = nextStatus;
    await collection.save();

    return res.status(200).json({ collection });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update status', error: error.message });
  }
};