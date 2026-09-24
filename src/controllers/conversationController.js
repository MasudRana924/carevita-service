const {
  createConversation,
  getConversationsByUserId,
  getConversationByIdForUser,
  getMessagesByConversationId,
  createMessage,
  markMessagesAsRead,
  countUserConversations
} = require('../models/Conversation');
const { parsePagination } = require('../utils/pagination');

/**
 * Get user's conversations
 */
exports.getUserConversations = async (req, res) => {
  try {
    const { status } = req.query;
    const { page, limit, offset } = parsePagination(req.query);

    const [conversations, total] = await Promise.all([
      getConversationsByUserId(req.user.id, { status, limit, offset }),
      countUserConversations(req.user.id, { status })
    ]);

    return res.paginated(conversations, { page, limit, total }, 'Conversations fetched successfully');
  } catch (error) {
    console.error('Get user conversations error:', error);
    return res.serverError('Failed to fetch conversations');
  }
};

/**
 * Get single conversation for user
 */
exports.getUserConversation = async (req, res) => {
  try {
    const conversation = await getConversationByIdForUser(req.params.id, req.user.id);
    if (!conversation) {
      return res.notFound('Conversation not found');
    }
    return res.success(conversation, 'Conversation fetched successfully');
  } catch (error) {
    console.error('Get user conversation error:', error);
    return res.serverError('Failed to fetch conversation');
  }
};

/**
 * Create new conversation
 */
exports.createConversation = async (req, res) => {
  try {
    const { subject, first_message } = req.body;
    
    const conversation = await createConversation({
      user_id: req.user.id,
      subject
    });

    // If first message is provided, create it
    if (first_message) {
      const message = await createMessage({
        conversation_id: conversation.id,
        sender_id: req.user.id,
        sender_role: 'user',
        message_type: 'text',
        message: first_message
      });
    }

    return res.success(conversation, 'Conversation created successfully');
  } catch (error) {
    console.error('Create conversation error:', error);
    return res.serverError('Failed to create conversation');
  }
};

/**
 * Get messages for a conversation
 */
exports.getConversationMessages = async (req, res) => {
  try {
    const conversation = await getConversationByIdForUser(req.params.id, req.user.id);
    if (!conversation) {
      return res.notFound('Conversation not found');
    }

    const { page, limit, offset } = parsePagination(req.query);
    const messages = await getMessagesByConversationId(req.params.id, { limit, offset });

    // Mark admin messages as read
    await markMessagesAsRead(req.params.id, 'admin');

    return res.success(messages, 'Messages fetched successfully');
  } catch (error) {
    console.error('Get conversation messages error:', error);
    return res.serverError('Failed to fetch messages');
  }
};

/**
 * Send message in conversation
 */
exports.sendMessage = async (req, res) => {
  try {
    const { conversation_id } = req.params;
    const { message_type = 'text', message } = req.body;

    // Verify user owns this conversation
    const conversation = await getConversationByIdForUser(conversation_id, req.user.id);
    if (!conversation) {
      return res.notFound('Conversation not found');
    }

    const newMessage = await createMessage({
      conversation_id,
      sender_id: req.user.id,
      sender_role: 'user',
      message_type,
      message
    });

    return res.success(newMessage, 'Message sent successfully');
  } catch (error) {
    console.error('Send message error:', error);
    return res.serverError('Failed to send message');
  }
};

/**
 * Mark messages as read
 */
exports.markAsRead = async (req, res) => {
  try {
    const conversation = await getConversationByIdForUser(req.params.id, req.user.id);
    if (!conversation) {
      return res.notFound('Conversation not found');
    }

    const messages = await markMessagesAsRead(req.params.id, 'admin');
    return res.success(messages, 'Messages marked as read');
  } catch (error) {
    console.error('Mark as read error:', error);
    return res.serverError('Failed to mark as read');
  }
};
