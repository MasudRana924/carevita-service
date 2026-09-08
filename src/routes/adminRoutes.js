const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

const admin = [authenticate, authorize('ADMIN')];

router.get('/dashboard', ...admin, adminController.getDashboardStats);

// Users
router.get('/users', ...admin, adminController.getAllUsers);
router.put('/users/:id', ...admin, adminController.updateUser);
router.put('/users/:id/status', ...admin, adminController.updateUserStatus);
router.delete('/users/:id', ...admin, adminController.deleteUserAccount);

// Nurses & providers
router.get('/nurses', ...admin, adminController.getAllNurses);
router.get('/providers', ...admin, adminController.getAllProviders);
router.put('/providers/:id/verify', ...admin, adminController.verifyProvider);

// Bookings
router.get('/bookings', ...admin, adminController.getAllBookings);

// Documents
router.get('/documents/pending', ...admin, adminController.getPendingDocuments);
router.put('/documents/:id/verify', ...admin, adminController.verifyDocument);

// Payments & revenue
router.get('/payments', ...admin, adminController.getAllPayments);
router.get('/revenue', ...admin, adminController.getRevenueStats);

// Hospitals
router.post('/hospitals', ...admin, upload.single('photo'), adminController.createHospital);
router.get('/hospitals', adminController.getAllHospitals);
router.put('/hospitals/:id/status', ...admin, adminController.updateHospitalStatus);

// Medicines CRUD
router.get('/medicines', ...admin, adminController.getAllMedicines);
router.post('/medicines', ...admin, adminController.createMedicine);
router.put('/medicines/:id', ...admin, adminController.updateMedicine);
router.delete('/medicines/:id', ...admin, adminController.deleteMedicine);

// Medicine orders
router.get('/orders', ...admin, adminController.getAllOrders);
router.get('/orders/:id', ...admin, adminController.getOrder);
router.put('/orders/:id/status', ...admin, adminController.updateOrderStatus);

module.exports = router;
