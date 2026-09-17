const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const adminOpsController = require('../controllers/adminOpsController');
const withdrawalController = require('../controllers/withdrawalController');
const bookingController = require('../controllers/bookingController');
const { authenticate, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

const admin = [authenticate, authorize('ADMIN')];

router.get('/profile', ...admin, adminController.getAdminProfile);
router.get('/dashboard', ...admin, adminController.getDashboardStats);

router.get('/users', ...admin, adminController.getAllUsers);
router.put('/users/:id/block', ...admin, adminController.blockUser);
router.put('/users/:id/unblock', ...admin, adminController.unblockUser);
router.put('/users/:id/status', ...admin, adminController.updateUserStatus);

router.get('/caregivers', ...admin, adminController.getAllCaregivers);
router.put('/caregivers/:id/block', ...admin, adminController.blockCaregiver);
router.put('/caregivers/:id/unblock', ...admin, adminController.unblockCaregiver);

router.get('/hospitals', ...admin, adminController.getAllHospitals);
router.post('/hospitals', ...admin, upload.single('photo'), adminController.createHospital);
router.put('/hospitals/:id', ...admin, upload.single('photo'), adminController.updateHospital);
router.put('/hospitals/:id/status', ...admin, adminController.updateHospitalStatus);

router.get('/bookings', ...admin, adminOpsController.getAllBookings);
router.get('/bookings/:id', ...admin, adminOpsController.getBooking);
router.post('/bookings/:id/cancel', ...admin, bookingController.cancelBooking);

router.get('/disputes', ...admin, adminOpsController.listDisputes);
router.patch('/disputes/:id', ...admin, adminOpsController.updateDispute);

router.get('/withdrawals', ...admin, withdrawalController.adminListWithdrawals);
router.post('/withdrawals/:id/approve', ...admin, withdrawalController.adminApproveWithdrawal);
router.post('/withdrawals/:id/reject', ...admin, withdrawalController.adminRejectWithdrawal);

router.get('/audit-logs', ...admin, adminOpsController.listAuditLogs);

module.exports = router;
