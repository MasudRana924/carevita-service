const express = require('express');
const router = express.Router();
const conversationController = require('../controllers/conversationController');
const { authenticate, authorize, authorizeOwnerOrAdmin } = require('../middleware/auth');
const { findConversationById } = require('../models/Conversation');

// All routes require authentication
router.use(authenticate);

// User routes
router.post('/', conversationController.createConversation);
router.get('/my', conversationController.getUserConversations);
router.get('/unread', conversationController.getUnreadCount);

// Admin routes
router.get('/', authorize('ADMIN'), conversationController.getAllConversations);

// Both admin and conversation owner can access these
router.get('/:conversation_id', 
  authorizeOwnerOrAdmin(async (req) => {
    const conversation = await findConversationById(req.params.conversation_id);
    return conversation ? conversation.user_id : null;
  }),
  conversationController.getConversationById
);

router.put('/:conversation_id/assign', authorize('ADMIN'), conversationController.assignAdmin);
router.put('/:conversation_id/status', authorize('ADMIN'), conversationController.updateStatus);

module.exports = router;
