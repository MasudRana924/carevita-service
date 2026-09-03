const express = require('express');
const router = express.Router();
const nurseController = require('../controllers/nurseController');
const { authenticate } = require('../middleware/auth');

router.post('/profile', authenticate, nurseController.createNurseProfile);
router.get('/profile', authenticate, nurseController.getNurseProfile);
router.put('/profile', authenticate, nurseController.updateNurseProfile);
router.put('/availability', authenticate, nurseController.updateAvailability);
router.get('/search', nurseController.searchNurses);
router.get('/:id', nurseController.getNurseById);
router.get('/bookings', authenticate, nurseController.getProviderBookings);
router.post('/bookings/:id/accept', authenticate, nurseController.acceptBooking);
router.put('/bookings/:id/status', authenticate, nurseController.updateBookingStatus);

module.exports = router;
