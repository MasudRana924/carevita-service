const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticate } = require('../middleware/auth');

router.post('/bkash', authenticate, paymentController.createBkashPayment);
router.get('/bkash/callback', paymentController.bkashCallback);
router.post('/execute', authenticate, paymentController.executePayment);
router.post('/verify', authenticate, paymentController.verifyPayment);
router.get('/:id', authenticate, paymentController.getPayment);
router.post('/:id/refund', authenticate, paymentController.refundPayment);
router.get('/', authenticate, paymentController.listPayments);

module.exports = router;
