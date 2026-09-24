const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const { authenticate, authorizeOwnerOrAdmin } = require('../middleware/auth');
const { findConversationById } = require('../models/Conversation');

// All routes require authentication
router.use(authenticate);

// Send a message (authorized in controller)
router.post('/', messageController.sendMessage);

// Get messages in a conversation - both admin and conversation owner can access
router.get('/conversation/:conversation_id', 
  authorizeOwnerOrAdmin(async (req) => {
    const conversation = await findConversationById(req.params.conversation_id);
    return conversation ? conversation.user_id : null;
  }),
  messageController.getConversationMessages
);

// Mark message as read (authorized in controller)
router.put('/:id/read', messageController.markAsRead);

// Mark all messages in conversation as read - both admin and conversation owner can access
router.put('/conversation/:conversation_id/read', 
  authorizeOwnerOrAdmin(async (req) => {
    const conversation = await findConversationById(req.params.conversation_id);
    return conversation ? conversation.user_id : null;
  }),
  messageController.markConversationAsRead
);

// Delete a message (authorized in controller - only sender can delete)
router.delete('/:id', messageController.deleteMessage);

// Get unread count for a conversation - both admin and conversation owner can access
router.get('/conversation/:conversation_id/unread', 
  authorizeOwnerOrAdmin(async (req) => {
    const conversation = await findConversationById(req.params.conversation_id);
    return conversation ? conversation.user_id : null;
  }),
  messageController.getConversationUnreadCount
);

module.exports = router;
