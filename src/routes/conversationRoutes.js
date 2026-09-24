const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const conversationController = require('../controllers/conversationController');

// User conversation routes
router.get('/', authenticate, conversationController.getUserConversations);
router.post('/', authenticate, conversationController.createConversation);
router.get('/:id', authenticate, conversationController.getUserConversation);
router.get('/:id/messages', authenticate, conversationController.getConversationMessages);
router.post('/:id/messages', authenticate, conversationController.sendMessage);
router.put('/:id/read', authenticate, conversationController.markAsRead);

module.exports = router;
