const express = require('express');
const router = express.Router();
const { updateSettlementBank } = require('../controllers/profileController');
const { protect } = require('../middleware/authMiddleware');

router.post('/bank', protect, updateSettlementBank);

module.exports = router;
