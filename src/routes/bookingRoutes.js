const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { authenticate } = require('../middleware/auth');
const { bookingWriteLimiter, reviewLimiter, safetyLimiter } = require('../middleware/rateLimiter');

router.post('/', authenticate, bookingWriteLimiter, bookingController.createBooking);
router.get('/', authenticate, bookingController.getBookings);
router.get('/:id/live-location', authenticate, bookingController.getLiveLocation);
router.get('/:id', authenticate, bookingController.getBooking);
router.post('/:id/review', authenticate, reviewLimiter, bookingController.submitReview);
router.post('/:id/cancel', authenticate, bookingWriteLimiter, bookingController.cancelBooking);
router.post('/:id/dispute', authenticate, bookingWriteLimiter, bookingController.createDispute);
router.get('/:id/disputes', authenticate, bookingController.getBookingDisputes);
router.post('/:id/safety-incident', authenticate, safetyLimiter, bookingController.reportSafetyIncident);

module.exports = router;
