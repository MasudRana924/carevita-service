const express = require('express');
const router = express.Router();
const ekycController = require('../controllers/ekycController');
const { authenticate } = require('../middleware/auth');

// Initiate eKYC verification
router.post('/initiate', authenticate, ekycController.initiateEKYC);

// Get eKYC status
router.get('/status', authenticate, ekycController.getEKYCStatus);

// Webhook handler for Didit (no authentication required)
router.post('/webhook', ekycController.handleEKYCWebhook);

module.exports = router;
