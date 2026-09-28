const {
  getOrCreateConversationForUser,
  getMessages
} = require('../models/Conversation');
const supportChat = require('../services/supportChatService');

const parseMessageQuery = (query = {}) => ({
  before: query.before || undefined,
  after: query.after || undefined,
  limit: Math.min(Math.max(parseInt(query.limit, 10) || 30, 1), 100)
});

const handleError = (res, error, fallback) => {
  if (error.statusCode === 400) return res.badRequest(error.message);
  console.error(`${fallback}:`, error);
  return res.serverError(fallback);
};

/**
 * Each user has exactly one support thread. Legacy routes that take a conversation id
 * resolve to the caller's own thread, so old app builds keep working.
 */
exports.getMyConversation = async (req, res) => {
  try {
    const conversation = await getOrCreateConversationForUser(req.user.id);
    return res.success(conversation, 'Conversation fetched successfully');
  } catch (error) {
    return handleError(res, error, 'Failed to fetch conversation');
  }
};

exports.getMyConversationList = async (req, res) => {
  try {
    const conversation = await getOrCreateConversationForUser(req.user.id);
    return res.paginated([conversation], { page: 1, limit: 1, total: 1 }, 'Conversations fetched successfully');
  } catch (error) {
    return handleError(res, error, 'Failed to fetch conversations');
  }
};

exports.getUnreadCount = async (req, res) => {
  try {
    const conversation = await getOrCreateConversationForUser(req.user.id);
    return res.success(
      { conversation_id: conversation.id, unread_count: conversation.user_unread_count },
      'Unread count fetched successfully'
    );
  } catch (error) {
    return handleError(res, error, 'Failed to fetch unread count');
  }
};

exports.getMessages = async (req, res) => {
  try {
    const conversation = await getOrCreateConversationForUser(req.user.id);
    const query = parseMessageQuery(req.query);
    const { messages, has_more } = await getMessages(conversation.id, query);

    // Opening the latest page = user has seen admin replies.
    let current = conversation;
    if (!query.before) {
      const read = await supportChat.markRead({ conversation, readerRole: 'user' });
      current = read.conversation || conversation;
    }

    return res.success(messages, 'Messages fetched successfully', {
      conversation: current,
      has_more
    });
  } catch (error) {
    return handleError(res, error, 'Failed to fetch messages');
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const input = supportChat.parseMessageInput(req);
    const conversation = await getOrCreateConversationForUser(req.user.id);
    const result = await supportChat.sendMessage({
      conversation,
      sender: req.user,
      senderRole: 'user',
      input
    });
    return res.created(result.message, 'Message sent successfully', { conversation: result.conversation });
  } catch (error) {
    return handleError(res, error, 'Failed to send message');
  }
};

/** Legacy POST /conversations — no new thread is created; first_message goes into the existing one. */
exports.createConversation = async (req, res) => {
  try {
    const conversation = await getOrCreateConversationForUser(req.user.id);
    const firstMessage = typeof req.body?.first_message === 'string' ? req.body.first_message.trim() : '';

    if (!firstMessage) {
      return res.success(conversation, 'Conversation fetched successfully');
    }

    req.body.message = firstMessage;
    const input = supportChat.parseMessageInput(req);
    const result = await supportChat.sendMessage({
      conversation,
      sender: req.user,
      senderRole: 'user',
      input
    });
    return res.success(result.conversation, 'Message sent successfully');
  } catch (error) {
    return handleError(res, error, 'Failed to send message');
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const conversation = await getOrCreateConversationForUser(req.user.id);
    const result = await supportChat.markRead({ conversation, readerRole: 'user' });
    return res.success(
      { marked: result.marked, conversation: result.conversation },
      'Messages marked as read'
    );
  } catch (error) {
    return handleError(res, error, 'Failed to mark as read');
  }
};
