const express = require('express');
const router = express.Router();
const notificationTokenController = require('../controllers/notificationTokenController');
const notificationPreferenceController = require('../controllers/notificationPreferenceController');
const inboxController = require('../controllers/inboxController');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, inboxController.listInbox);
router.get('/unread-count', authenticate, inboxController.unreadCount);
router.put('/read-all', authenticate, inboxController.markAllRead);

router.post('/tokens', authenticate, notificationTokenController.registerToken);
router.get('/tokens', authenticate, notificationTokenController.getUserTokens);
router.delete('/tokens/device/:device_id', authenticate, notificationTokenController.deleteTokenByDevice);
router.delete('/tokens/:id', authenticate, notificationTokenController.deleteToken);
router.post('/tokens/deactivate-all', authenticate, notificationTokenController.deactivateAllTokens);

router.get('/preferences', authenticate, notificationPreferenceController.getPreferences);
router.put('/preferences', authenticate, notificationPreferenceController.updatePreferences);

router.get('/:id', authenticate, inboxController.getInboxItem);
router.put('/:id/read', authenticate, inboxController.markRead);
router.delete('/:id', authenticate, inboxController.deleteInboxItem);

module.exports = router;
