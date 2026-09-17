const express = require('express');
const router = express.Router();
const notificationTokenController = require('../controllers/notificationTokenController');
const notificationPreferenceController = require('../controllers/notificationPreferenceController');
const { authenticate } = require('../middleware/auth');

router.post('/tokens', authenticate, notificationTokenController.registerToken);
router.get('/tokens', authenticate, notificationTokenController.getUserTokens);
router.delete('/tokens/:id', authenticate, notificationTokenController.deleteToken);
router.delete('/tokens/device/:device_id', authenticate, notificationTokenController.deleteTokenByDevice);
router.post('/tokens/deactivate-all', authenticate, notificationTokenController.deactivateAllTokens);

router.get('/preferences', authenticate, notificationPreferenceController.getPreferences);
router.put('/preferences', authenticate, notificationPreferenceController.updatePreferences);

module.exports = router;
