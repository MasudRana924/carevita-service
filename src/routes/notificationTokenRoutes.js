const express = require('express');
const router = express.Router();
const notificationTokenController = require('../controllers/notificationTokenController');
const { authenticate } = require('../middleware/auth');

// Notification token management
router.post('/tokens', authenticate, notificationTokenController.registerToken);
router.get('/tokens', authenticate, notificationTokenController.getUserTokens);
router.delete('/tokens/:id', authenticate, notificationTokenController.deleteToken);
router.delete('/tokens/device/:device_id', authenticate, notificationTokenController.deleteTokenByDevice);
router.post('/tokens/deactivate-all', authenticate, notificationTokenController.deactivateAllTokens);

module.exports = router;
