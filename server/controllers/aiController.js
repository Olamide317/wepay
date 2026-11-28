const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Collection = require("../models/Collection");
const Transaction = require("../models/Transaction");
const aiService = require("../services/aiService");
const { isFounderEmail } = require("../middleware/authMiddleware");

const optionalUser = async (req) => {
  const header = req.headers?.authorization;
  if (!header || !header.startsWith("Bearer ")) return null;
  try {
    const decoded = jwt.verify(header.split(" ")[1], process.env.JWT_SECRET);
    return await User.findById(decoded.id).select("-passwordHash");
  } catch {
    return null;
  }
};

exports.navigate = async (req, res) => {
  try {
    const user = await optionalUser(req);
    const result = await aiService.navigateAndGuide({
      message: req.body?.message,
      currentPath: req.body?.currentPath,
      isAuthenticated: Boolean(user),
      isFounder: Boolean(user && isFounderEmail(user.email)),
    });
    return res.status(200).json({ ...result.data, source: result.source });
  } catch (error) {
    return res.status(500).json({ message: "AI navigator unavailable.", error: error.message });
  }
};

exports.draftCollection = async (req, res) => {
  try {
    const result = await aiService.draftCollectionFromPrompt(req.body?.prompt);
    return res.status(200).json({ draft: result.data, source: result.source });
  } catch (error) {
    return res.status(500).json({ message: "Unable to draft collection.", error: error.message });
  }
};

exports.askLedger = async (req, res) => {
  try {
    const collections = await Collection.find({ organizer: req.user._id }).lean();
    const collectionIds = collections.map((collection) => collection._id);
    const transactions = await Transaction.find({ collectionId: { $in: collectionIds } }).sort({ createdAt: -1 }).lean();
    const result = await aiService.queryOrganizerLedger({
      question: req.body?.question,
      collections,
      transactions,
    });
    return res.status(200).json({ ...result.data, source: result.source });
  } catch (error) {
    return res.status(500).json({ message: "Unable to search organizer ledger.", error: error.message });
  }
};

exports.collectionInsights = async (req, res) => {
  try {
    const collection = await Collection.findOne({ _id: req.params.id, organizer: req.user._id }).lean();
    if (!collection) return res.status(404).json({ message: "Collection not found or not owned by this organizer." });
    const transactions = await Transaction.find({ collectionId: collection._id }).sort({ createdAt: -1 }).lean();
    const result = await aiService.analyzeCollectionTelemetry({ collection, transactions });
    return res.status(200).json({ analysis: result.data, source: result.source });
  } catch (error) {
    return res.status(500).json({ message: "Unable to analyze collection.", error: error.message });
  }
};

exports.fraudRadar = async (req, res) => {
  try {
    const [collections, transactions] = await Promise.all([
      Collection.find().sort({ createdAt: -1 }).limit(100).lean(),
      Transaction.find().sort({ createdAt: -1 }).limit(500).lean(),
    ]);
    const result = await aiService.scanPlatformAnomalies({ collections, transactions });
    return res.status(200).json({ radar: result.data, source: result.source });
  } catch (error) {
    return res.status(500).json({ message: "Unable to scan platform anomalies.", error: error.message });
  }
};
