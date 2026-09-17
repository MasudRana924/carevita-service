const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticate } = require('../middleware/auth');

router.post('/bkash/token', authenticate, paymentController.getToken);
router.post('/bkash/create', authenticate, paymentController.createPayment);
router.post('/bkash/execute', authenticate, paymentController.executePayment);
router.post('/bkash/query', authenticate, paymentController.queryPayment);
router.post('/bkash/refund', authenticate, paymentController.refundPayment);
router.post('/bkash/refund/status', authenticate, paymentController.refundStatus);
router.post('/bkash/callback', paymentController.bkashCallback);

module.exports = router;
