const express = require('express');
const router = express.Router();
const disputeController = require('../controllers/disputeController');
const { authenticate, authorize } = require('../middleware/auth');

// Dispute management
router.post('/bookings/:booking_id/dispute', authenticate, disputeController.createDispute);
router.get('/disputes/:id', authenticate, disputeController.getDispute);
router.get('/bookings/:booking_id/dispute', authenticate, disputeController.getBookingDispute);

// Admin dispute management
router.get('/admin/disputes', authenticate, authorize(['ADMIN']), disputeController.getAllDisputes);
router.patch('/admin/disputes/:id', authenticate, authorize(['ADMIN']), disputeController.updateDispute);

module.exports = router;
