const express = require('express');
const router = express.Router();
const {
  initializePayment,
  verifyPayment,
  handleWebhook,
  handleCheckoutRedirectReturn,
  getReceipt,
} = require('../controllers/paymentController');

router.post('/initialize', initializePayment);
router.post('/verify', verifyPayment);
router.post('/webhook', handleWebhook);
router.get('/redirect-return', handleCheckoutRedirectReturn);
router.post('/redirect-return', handleCheckoutRedirectReturn);
router.get('/receipt/:receiptCode', getReceipt);

module.exports = router;
