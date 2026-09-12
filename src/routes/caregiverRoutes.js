const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const caregiverController = require('../controllers/caregiverController');
const bookingController = require('../controllers/bookingController');

router.post('/profile', authenticate, authorize('CAREGIVER'), upload.single('profile_photo'), caregiverController.createProfile);
router.get('/profile', authenticate, authorize('CAREGIVER'), caregiverController.getMyProfile);
router.put('/profile', authenticate, authorize('CAREGIVER'), upload.single('profile_photo'), caregiverController.updateMyProfile);
router.get('/search', caregiverController.searchCaregivers);
router.get('/bookings/my', authenticate, authorize('CAREGIVER'), caregiverController.getMyBookings);
router.post('/bookings/:id/accept', authenticate, authorize('CAREGIVER'), bookingController.acceptBooking);
router.post('/bookings/:id/reject', authenticate, authorize('CAREGIVER'), bookingController.rejectBooking);
router.get('/:id', caregiverController.viewCaregiverProfile);

module.exports = router;
