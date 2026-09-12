const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticate } = require('../middleware/auth');

router.post('/bkash/token', authenticate, paymentController.getToken);
router.post('/bkash/create', authenticate, paymentController.createPayment);
router.post('/bkash/execute', authenticate, paymentController.executePayment);

module.exports = router;
