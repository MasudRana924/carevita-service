const express = require('express');
const router = express.Router();
const withdrawalController = require('../controllers/withdrawalController');
const { authenticate, authorize } = require('../middleware/auth');

// Provider withdrawal management
router.post('/withdrawals', authenticate, authorize(['CAREGIVER', 'NURSE']), withdrawalController.createWithdrawal);
router.get('/withdrawals', authenticate, authorize(['CAREGIVER', 'NURSE']), withdrawalController.getWithdrawals);
router.get('/withdrawals/:id', authenticate, authorize(['CAREGIVER', 'NURSE', 'ADMIN']), withdrawalController.getWithdrawalById);

// Admin withdrawal management
router.get('/admin/withdrawals', authenticate, authorize(['ADMIN']), withdrawalController.getAllWithdrawals);
router.patch('/admin/withdrawals/:id/approve', authenticate, authorize(['ADMIN']), withdrawalController.approveWithdrawal);
router.patch('/admin/withdrawals/:id/reject', authenticate, authorize(['ADMIN']), withdrawalController.rejectWithdrawal);
router.patch('/admin/withdrawals/:id/complete', authenticate, authorize(['ADMIN']), withdrawalController.completeWithdrawal);

module.exports = router;
