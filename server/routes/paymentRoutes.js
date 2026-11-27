const express = require('express');
const router = express.Router();
const {
  initializePayment,
  verifyPayment,
  handleWebhook,
  getReceipt,
} = require('../controllers/paymentController');

router.post('/initialize', initializePayment);
router.post('/verify', verifyPayment);
router.post('/webhook', handleWebhook);
router.get('/receipt/:receiptCode', getReceipt);

module.exports = router;
