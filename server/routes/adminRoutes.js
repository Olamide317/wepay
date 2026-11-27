const express = require('express');
const {
  exportMasterTransactionsCsv,
  getAdminOverview,
} = require('../controllers/adminController');
const { protect, requireFounder } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/overview', protect, requireFounder, getAdminOverview);
router.get('/transactions/export.csv', protect, requireFounder, exportMasterTransactionsCsv);

module.exports = router;
