const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const caregiverController = require('../controllers/caregiverController');

router.post('/profile', authenticate, authorize('CAREGIVER'), upload.single('profile_photo'), caregiverController.createProfile);
router.get('/profile', authenticate, authorize('CAREGIVER'), caregiverController.getMyProfile);
router.put('/profile', authenticate, authorize('CAREGIVER'), upload.single('profile_photo'), caregiverController.updateMyProfile);
router.post('/documents', authenticate, authorize('CAREGIVER'), caregiverController.submitDocument);
router.get('/availability', authenticate, authorize('CAREGIVER'), caregiverController.getMyAvailability);
router.post('/availability', authenticate, authorize('CAREGIVER'), caregiverController.setMyAvailability);
router.get('/search', authenticate, caregiverController.searchCaregivers);
router.get('/:id', authenticate, caregiverController.viewCaregiverProfile);
router.get('/bookings/my', authenticate, authorize('CAREGIVER'), caregiverController.getMyBookings);
router.get('/earnings/my', authenticate, authorize('CAREGIVER'), caregiverController.getMyEarnings);
router.get('/reviews/my', authenticate, authorize('CAREGIVER'), caregiverController.getMyReviews);

module.exports = router;
