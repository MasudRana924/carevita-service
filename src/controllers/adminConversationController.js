const {
  getAllConversations,
  getConversationById,
  getMessagesByConversationId,
  createMessage,
  markMessagesAsRead,
  updateConversationStatus,
  countConversations
} = require('../models/Conversation');
const { parsePagination } = require('../utils/pagination');
const { sendPushNotification } = require('../services/notificationService');
const { getUserTokens } = require('../models/NotificationToken');

/**
 * Get all conversations (admin)
 */
exports.getAllConversations = async (req, res) => {
  try {
    const { status, search } = req.query;
    const { page, limit, offset } = parsePagination(req.query);

    const [conversations, total] = await Promise.all([
      getAllConversations({ status, search, limit, offset }),
      countConversations({ status, search })
    ]);

    return res.paginated(conversations, { page, limit, total }, 'Conversations fetched successfully');
  } catch (error) {
    console.error('Get all conversations error:', error);
    return res.serverError('Failed to fetch conversations');
  }
};

/**
 * Get single conversation details (admin)
 */
exports.getConversation = async (req, res) => {
  try {
    const conversation = await getConversationById(req.params.id);
    if (!conversation) {
      return res.notFound('Conversation not found');
    }
    return res.success(conversation, 'Conversation fetched successfully');
  } catch (error) {
    console.error('Get conversation error:', error);
    return res.serverError('Failed to fetch conversation');
  }
};

/**
 * Get messages for a conversation (admin)
 */
exports.getConversationMessages = async (req, res) => {
  try {
    const conversation = await getConversationById(req.params.id);
    if (!conversation) {
      return res.notFound('Conversation not found');
    }

    const { page, limit, offset } = parsePagination(req.query);
    const messages = await getMessagesByConversationId(req.params.id, { limit, offset });

    // Mark user messages as read
    await markMessagesAsRead(req.params.id, 'user');

    return res.success(messages, 'Messages fetched successfully');
  } catch (error) {
    console.error('Get conversation messages error:', error);
    return res.serverError('Failed to fetch messages');
  }
};

/**
 * Admin reply to conversation
 */
exports.replyToConversation = async (req, res) => {
  try {
    const { conversation_id } = req.params;
    const { message_type = 'text', message } = req.body;

    const conversation = await getConversationById(conversation_id);
    if (!conversation) {
      return res.notFound('Conversation not found');
    }

    const newMessage = await createMessage({
      conversation_id,
      sender_id: req.user.id,
      sender_role: 'admin',
      message_type,
      message
    });

    // Send push notification to user
    const tokens = await getUserTokens(conversation.user_id);
    if (tokens && tokens.length > 0) {
      const validTokens = tokens.filter(t => t.is_active).map(t => t.token);
      
      if (validTokens.length > 0) {
        await sendPushNotification({
          tokens: validTokens,
          title: 'New message from support',
          body: message.substring(0, 100) + (message.length > 100 ? '...' : ''),
          data: {
            type: 'conversation_message',
            conversation_id: conversation_id,
            message_id: newMessage.id
          }
        });
      }
    }

    // Emit via WebSocket to user
    const { emitNewMessage } = require('../realtime/conversationSocket');
    emitNewMessage(conversation_id, newMessage);

    return res.success(newMessage, 'Reply sent successfully');
  } catch (error) {
    console.error('Reply to conversation error:', error);
    return res.serverError('Failed to send reply');
  }
};

/**
 * Update conversation status (admin)
 */
exports.updateConversationStatus = async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['active', 'closed', 'archived'].includes(status)) {
      return res.badRequest('Invalid status. Must be active, closed, or archived');
    }

    const conversation = await updateConversationStatus(req.params.id, status);
    if (!conversation) {
      return res.notFound('Conversation not found');
    }

    return res.success(conversation, 'Conversation status updated successfully');
  } catch (error) {
    console.error('Update conversation status error:', error);
    return res.serverError('Failed to update conversation status');
  }
};

/**
 * Mark messages as read (admin)
 */
exports.markAsRead = async (req, res) => {
  try {
    const conversation = await getConversationById(req.params.id);
    if (!conversation) {
      return res.notFound('Conversation not found');
    }

    const messages = await markMessagesAsRead(req.params.id, 'user');
    return res.success(messages, 'Messages marked as read');
  } catch (error) {
    console.error('Mark as read error:', error);
    return res.serverError('Failed to mark as read');
  }
};
