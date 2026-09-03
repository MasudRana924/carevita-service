const express = require('express');
const router = express.Router();
const ambulanceController = require('../controllers/ambulanceController');
const { authenticate } = require('../middleware/auth');

router.post('/', authenticate, ambulanceController.createAmbulanceBooking);
router.get('/', authenticate, ambulanceController.getAmbulanceBookings);
router.get('/:id', authenticate, ambulanceController.getAmbulanceBooking);
router.delete('/:id', authenticate, ambulanceController.cancelAmbulanceBooking);

module.exports = router;
