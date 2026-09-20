const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { authenticate } = require('../middleware/auth');

router.post('/', authenticate, bookingController.createBooking);
router.get('/', authenticate, bookingController.getBookings);
router.get('/:id', authenticate, bookingController.getBooking);
router.post('/:id/review', authenticate, bookingController.submitReview);
router.post('/:id/cancel', authenticate, bookingController.cancelBooking);
router.post('/:id/dispute', authenticate, bookingController.createDispute);
router.get('/:id/disputes', authenticate, bookingController.getBookingDisputes);

module.exports = router;
