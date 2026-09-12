const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const inboxController = require('../controllers/inboxController');

router.get('/', authenticate, inboxController.listInbox);
router.get('/unread-count', authenticate, inboxController.unreadCount);
router.put('/read-all', authenticate, inboxController.markAllRead);
router.get('/:id', authenticate, inboxController.getInboxItem);
router.put('/:id/read', authenticate, inboxController.markRead);

module.exports = router;
