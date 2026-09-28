const pool = require('../config/database');
const {
  getAllConversations,
  getConversationById,
  getOrCreateConversationForUser,
  getMessages,
  getAdminUnreadSummary,
  updateConversationStatus,
  countConversations
} = require('../models/Conversation');
const { parsePagination } = require('../utils/pagination');
const supportChat = require('../services/supportChatService');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

const loadConversation = async (req, res) => {
  if (!UUID_RE.test(req.params.id)) {
    res.badRequest('Invalid conversation id');
    return null;
  }
  const conversation = await getConversationById(req.params.id);
  if (!conversation) {
    res.notFound('Conversation not found');
    return null;
  }
  return conversation;
};

/**
 * Admin inbox: one row per user, latest activity first.
 */
exports.getAllConversations = async (req, res) => {
  try {
    const { status, search } = req.query;
    const unread_only = ['true', '1'].includes(String(req.query.unread_only || '').toLowerCase());
    const { page, limit, offset } = parsePagination(req.query);

    const [conversations, total] = await Promise.all([
      getAllConversations({ status, search, unread_only, limit, offset }),
      countConversations({ status, search, unread_only })
    ]);

    return res.paginated(conversations, { page, limit, total }, 'Conversations fetched successfully');
  } catch (error) {
    return handleError(res, error, 'Failed to fetch conversations');
  }
};

exports.getUnreadSummary = async (req, res) => {
  try {
    const summary = await getAdminUnreadSummary();
    return res.success(summary, 'Unread summary fetched successfully');
  } catch (error) {
    return handleError(res, error, 'Failed to fetch unread summary');
  }
};

/** Open (or create) the thread with a specific user so admin can message first. */
exports.getConversationForUser = async (req, res) => {
  try {
    if (!UUID_RE.test(req.params.userId)) {
      return res.badRequest('Invalid user id');
    }
    const user = await pool.query('SELECT id FROM users WHERE id = $1', [req.params.userId]);
    if (!user.rows[0]) {
      return res.notFound('User not found');
    }
    const conversation = await getOrCreateConversationForUser(req.params.userId);
    return res.success(conversation, 'Conversation fetched successfully');
  } catch (error) {
    return handleError(res, error, 'Failed to fetch conversation');
  }
};

exports.getConversation = async (req, res) => {
  try {
    const conversation = await loadConversation(req, res);
    if (!conversation) return undefined;
    return res.success(conversation, 'Conversation fetched successfully');
  } catch (error) {
    return handleError(res, error, 'Failed to fetch conversation');
  }
};

exports.getConversationMessages = async (req, res) => {
  try {
    const conversation = await loadConversation(req, res);
    if (!conversation) return undefined;

    const query = parseMessageQuery(req.query);
    const { messages, has_more } = await getMessages(conversation.id, query);

    let current = conversation;
    if (!query.before) {
      const read = await supportChat.markRead({ conversation, readerRole: 'admin' });
      current = read.conversation ? { ...conversation, ...read.conversation } : conversation;
    }

    return res.success(messages, 'Messages fetched successfully', { conversation: current, has_more });
  } catch (error) {
    return handleError(res, error, 'Failed to fetch messages');
  }
};

exports.replyToConversation = async (req, res) => {
  try {
    const conversation = await loadConversation(req, res);
    if (!conversation) return undefined;

    const input = supportChat.parseMessageInput(req);
    const result = await supportChat.sendMessage({
      conversation,
      sender: req.user,
      senderRole: 'admin',
      input
    });

    return res.created(result.message, 'Reply sent successfully', { conversation: result.conversation });
  } catch (error) {
    return handleError(res, error, 'Failed to send reply');
  }
};

exports.updateConversationStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['active', 'closed', 'archived'].includes(status)) {
      return res.badRequest('Invalid status. Must be active, closed, or archived');
    }

    const existing = await loadConversation(req, res);
    if (!existing) return undefined;

    const conversation = await updateConversationStatus(existing.id, status);
    return res.success(conversation, 'Conversation status updated successfully');
  } catch (error) {
    return handleError(res, error, 'Failed to update conversation status');
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const conversation = await loadConversation(req, res);
    if (!conversation) return undefined;

    const result = await supportChat.markRead({ conversation, readerRole: 'admin' });
    return res.success(
      { marked: result.marked, conversation: result.conversation },
      'Messages marked as read'
    );
  } catch (error) {
    return handleError(res, error, 'Failed to mark as read');
  }
};
