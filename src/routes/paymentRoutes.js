const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticate } = require('../middleware/auth');
const { paymentLimiter, webhookLimiter } = require('../middleware/rateLimiter');

router.post('/bkash/token', authenticate, paymentLimiter, paymentController.getToken);
router.post('/bkash/create', authenticate, paymentLimiter, paymentController.createPayment);
router.post('/bkash/execute', authenticate, paymentLimiter, paymentController.executePayment);
router.post('/bkash/query', authenticate, paymentLimiter, paymentController.queryPayment);
router.post('/bkash/refund', authenticate, paymentLimiter, paymentController.refundPayment);
router.post('/bkash/refund/status', authenticate, paymentLimiter, paymentController.refundStatus);
router.post('/bkash/callback', webhookLimiter, paymentController.bkashCallback);

module.exports = router;
