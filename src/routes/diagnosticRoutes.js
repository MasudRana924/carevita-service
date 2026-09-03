const express = require('express');
const router = express.Router();
const diagnosticController = require('../controllers/diagnosticController');
const { authenticate } = require('../middleware/auth');

router.get('/tests/search', diagnosticController.searchDiagnosticTests);
router.get('/centers', diagnosticController.getDiagnosticCenters);
router.post('/bookings', authenticate, diagnosticController.createDiagnosticBooking);
router.get('/bookings', authenticate, diagnosticController.getDiagnosticBookings);
router.get('/bookings/:id', authenticate, diagnosticController.getDiagnosticBooking);
router.delete('/bookings/:id', authenticate, diagnosticController.cancelDiagnosticBooking);

module.exports = router;
