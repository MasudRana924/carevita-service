const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { authenticate } = require('../middleware/auth');

router.post('/', authenticate, bookingController.createBooking);
router.get('/', authenticate, bookingController.getBookings);
router.get('/:id', authenticate, bookingController.getBooking);
router.post('/:id/accept', authenticate, bookingController.acceptBooking);
router.post('/:id/reject', authenticate, bookingController.rejectBooking);
router.post('/:id/cancel', authenticate, bookingController.cancelBooking);

module.exports = router;
