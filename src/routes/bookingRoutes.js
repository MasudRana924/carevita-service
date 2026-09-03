const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { authenticate } = require('../middleware/auth');

router.post('/', authenticate, bookingController.createBooking);
router.get('/', authenticate, bookingController.getBookings);
router.get('/:id', authenticate, bookingController.getBooking);
router.put('/:id', authenticate, bookingController.updateBooking);
router.delete('/:id', authenticate, bookingController.cancelBooking);
router.get('/providers/available', bookingController.getAvailableProviders);

module.exports = router;
