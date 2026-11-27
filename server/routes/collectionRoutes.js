const express = require('express');
const router = express.Router();
const {
  createCollection,
  getMyCollections,
  getCollectionBySlug,
  getCollectionLedger,
  updateCollectionStatus,
} = require('../controllers/collectionController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, createCollection);
router.get('/', protect, getMyCollections);
router.get('/:id/ledger', protect, getCollectionLedger);
router.get('/:slug', getCollectionBySlug);
router.patch('/:slug/status', protect, updateCollectionStatus);

module.exports = router;