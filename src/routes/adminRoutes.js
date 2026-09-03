const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/dashboard', authenticate, authorize('admin'), adminController.getDashboardStats);
router.get('/users', authenticate, authorize('admin'), adminController.getAllUsers);
router.put('/users/:id/status', authenticate, authorize('admin'), adminController.updateUserStatus);
router.get('/bookings', authenticate, authorize('admin'), adminController.getAllBookings);
router.get('/providers', authenticate, authorize('admin'), adminController.getAllProviders);
router.put('/providers/:id/verify', authenticate, authorize('admin'), adminController.verifyProvider);
router.get('/support-tickets', authenticate, authorize('admin'), adminController.getAllSupportTickets);
router.put('/support-tickets/:id/assign', authenticate, authorize('admin'), adminController.assignSupportTicket);
router.put('/support-tickets/:id/resolve', authenticate, authorize('admin'), adminController.resolveSupportTicket);
router.get('/payments', authenticate, authorize('admin'), adminController.getAllPayments);
router.get('/hospitals', authenticate, authorize('admin'), adminController.getAllHospitals);
router.put('/hospitals/:id/verify', authenticate, authorize('admin'), adminController.verifyHospital);

module.exports = router;
