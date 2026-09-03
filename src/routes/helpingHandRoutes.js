const express = require('express');
const router = express.Router();
const helpingHandController = require('../controllers/helpingHandController');
const { authenticate } = require('../middleware/auth');

router.post('/profile', authenticate, helpingHandController.createHelpingHandProfile);
router.get('/profile', authenticate, helpingHandController.getHelpingHandProfile);
router.put('/profile', authenticate, helpingHandController.updateHelpingHandProfile);
router.put('/availability', authenticate, helpingHandController.updateAvailability);
router.get('/search', helpingHandController.searchHelpingHands);
router.get('/:id', helpingHandController.getHelpingHandById);
router.get('/bookings', authenticate, helpingHandController.getProviderBookings);
router.post('/bookings/:id/accept', authenticate, helpingHandController.acceptBooking);
router.put('/bookings/:id/status', authenticate, helpingHandController.updateBookingStatus);
router.get('/bookings/:id/timeline', helpingHandController.getBookingTimeline);

module.exports = router;
