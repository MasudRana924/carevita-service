const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.get('/dashboard', authenticate, authorize('ADMIN'), adminController.getDashboardStats);
router.get('/users', authenticate, authorize('ADMIN'), adminController.getAllUsers);
router.put('/users/:id/status', authenticate, authorize('ADMIN'), adminController.updateUserStatus);
router.get('/bookings', authenticate, authorize('ADMIN'), adminController.getAllBookings);
router.get('/providers', authenticate, authorize('ADMIN'), adminController.getAllProviders);
router.put('/providers/:id/verify', authenticate, authorize('ADMIN'), adminController.verifyProvider);
router.get('/documents/pending', authenticate, authorize('ADMIN'), adminController.getPendingDocuments);
router.put('/documents/:id/verify', authenticate, authorize('ADMIN'), adminController.verifyDocument);
router.get('/payments', authenticate, authorize('ADMIN'), adminController.getAllPayments);
router.post('/hospitals', authenticate, authorize('ADMIN'), upload.single('photo'), adminController.createHospital);
router.get('/hospitals',  adminController.getAllHospitals);
// router.get('/hospitals', authenticate, authorize('ADMIN'), adminController.getAllHospitals);
router.put('/hospitals/:id/status', authenticate, authorize('ADMIN'), adminController.updateHospitalStatus);
router.get('/revenue', authenticate, authorize('ADMIN'), adminController.getRevenueStats);

module.exports = router;
