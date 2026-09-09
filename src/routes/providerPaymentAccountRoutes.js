const express = require('express');
const router = express.Router();
const providerPaymentAccountController = require('../controllers/providerPaymentAccountController');
const { authenticate, authorize } = require('../middleware/auth');

// Provider payment account management
router.post('/payment-accounts', authenticate, authorize(['CAREGIVER', 'NURSE']), providerPaymentAccountController.addPaymentAccount);
router.get('/payment-accounts', authenticate, authorize(['CAREGIVER', 'NURSE']), providerPaymentAccountController.getPaymentAccounts);
router.patch('/payment-accounts/:id', authenticate, authorize(['CAREGIVER', 'NURSE']), providerPaymentAccountController.updatePaymentAccount);
router.delete('/payment-accounts/:id', authenticate, authorize(['CAREGIVER', 'NURSE']), providerPaymentAccountController.deletePaymentAccount);

module.exports = router;
