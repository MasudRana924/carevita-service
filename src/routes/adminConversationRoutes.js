const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const adminConversationController = require('../controllers/adminConversationController');

// Admin conversation routes
router.get('/', authenticate, requireAdmin, adminConversationController.getAllConversations);
router.get('/:id', authenticate, requireAdmin, adminConversationController.getConversation);
router.get('/:id/messages', authenticate, requireAdmin, adminConversationController.getConversationMessages);
router.post('/:id/reply', authenticate, requireAdmin, adminConversationController.replyToConversation);
router.put('/:id/status', authenticate, requireAdmin, adminConversationController.updateConversationStatus);
router.put('/:id/read', authenticate, requireAdmin, adminConversationController.markAsRead);

module.exports = router;
