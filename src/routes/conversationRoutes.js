const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const upload = require('../middleware/upload');
const conversationController = require('../controllers/conversationController');

// Single support thread per user (WhatsApp-style)
router.get('/me', authenticate, conversationController.getMyConversation);
router.get('/me/unread-count', authenticate, conversationController.getUnreadCount);
router.get('/me/messages', authenticate, conversationController.getMessages);
router.post('/me/messages', authenticate, upload.chatAttachment('file'), conversationController.sendMessage);
router.put('/me/read', authenticate, conversationController.markAsRead);

// Legacy routes (old app builds) — all resolve to the caller's single thread
router.get('/', authenticate, conversationController.getMyConversationList);
router.post('/', authenticate, conversationController.createConversation);
router.get('/:id', authenticate, conversationController.getMyConversation);
router.get('/:id/messages', authenticate, conversationController.getMessages);
router.post('/:id/messages', authenticate, upload.chatAttachment('file'), conversationController.sendMessage);
router.put('/:id/read', authenticate, conversationController.markAsRead);

module.exports = router;
