const express = require('express');
const router = express.Router();
const {
  createCollection,
  getMyCollections,
  getCollectionBySlug,
  updateCollectionStatus,
} = require('../controllers/collectionController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, createCollection);
router.get('/', protect, getMyCollections);
router.get('/:slug', getCollectionBySlug);
router.patch('/:slug/status', protect, updateCollectionStatus);

module.exports = router;