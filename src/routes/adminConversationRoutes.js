const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const upload = require('../middleware/upload');
const adminConversationController = require('../controllers/adminConversationController');

router.use(authenticate, requireAdmin);

router.get('/', adminConversationController.getAllConversations);
router.get('/unread-summary', adminConversationController.getUnreadSummary);
router.get('/user/:userId', adminConversationController.getConversationForUser);
router.get('/:id', adminConversationController.getConversation);
router.get('/:id/messages', adminConversationController.getConversationMessages);
router.post('/:id/messages', upload.chatAttachment('file'), adminConversationController.replyToConversation);
router.post('/:id/reply', upload.chatAttachment('file'), adminConversationController.replyToConversation);
router.put('/:id/status', adminConversationController.updateConversationStatus);
router.put('/:id/read', adminConversationController.markAsRead);

module.exports = router;
