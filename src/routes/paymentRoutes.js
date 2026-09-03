const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticate } = require('../middleware/auth');

router.post('/', authenticate, paymentController.createPayment);
router.get('/', authenticate, paymentController.getPayments);
router.get('/:id', authenticate, paymentController.getPayment);
router.post('/:id/refund', authenticate, paymentController.refundPayment);

module.exports = router;
