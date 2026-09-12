const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

const admin = [authenticate, authorize('ADMIN')];

router.get('/profile', ...admin, adminController.getAdminProfile);
router.get('/dashboard', ...admin, adminController.getDashboardStats);

// Users
router.get('/users', ...admin, adminController.getAllUsers);
router.put('/users/:id/block', ...admin, adminController.blockUser);
router.put('/users/:id/unblock', ...admin, adminController.unblockUser);
router.put('/users/:id/status', ...admin, adminController.updateUserStatus);

// Caregivers
router.get('/caregivers', ...admin, adminController.getAllCaregivers);
router.put('/caregivers/:id/block', ...admin, adminController.blockCaregiver);
router.put('/caregivers/:id/unblock', ...admin, adminController.unblockCaregiver);

// Hospitals
router.get('/hospitals', ...admin, adminController.getAllHospitals);
router.post('/hospitals', ...admin, upload.single('photo'), adminController.createHospital);
router.put('/hospitals/:id', ...admin, upload.single('photo'), adminController.updateHospital);
router.put('/hospitals/:id/status', ...admin, adminController.updateHospitalStatus);

module.exports = router;
