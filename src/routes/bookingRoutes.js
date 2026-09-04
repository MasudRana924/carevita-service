const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { authenticate } = require('../middleware/auth');

router.post('/', authenticate, bookingController.createBooking);
router.get('/', authenticate, bookingController.getBookings);
router.get('/:id', authenticate, bookingController.getBooking);
router.put('/:id', authenticate, bookingController.updateBooking);
router.post('/:id/accept', authenticate, bookingController.acceptBooking);
router.post('/:id/reject', authenticate, bookingController.rejectBooking);
router.post('/:id/start', authenticate, bookingController.startService);
router.post('/:id/pickup', authenticate, bookingController.pickupPatient);
router.post('/:id/complete', authenticate, bookingController.completeService);
router.post('/:id/cancel', authenticate, bookingController.cancelBooking);
router.post('/:id/review', authenticate, bookingController.submitReview);

module.exports = router;
