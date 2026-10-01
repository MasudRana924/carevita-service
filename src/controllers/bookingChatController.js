const asyncHandler = require('../utils/asyncHandler');
const bookingChat = require('../services/bookingChatService');

const parseMessageQuery = (query = {}) => ({
  before: query.before || undefined,
  after: query.after || undefined,
  limit: Math.min(Math.max(parseInt(query.limit, 10) || 30, 1), 100)
});

const mapServiceError = (res, error, fallback) => {
  if (error.statusCode) {
    return res.error(error.message, [], error.statusCode, error.code);
  }
  console.error(fallback, error);
  return res.serverError(fallback);
};

exports.getChat = asyncHandler(async (req, res) => {
  try {
    const chat = await bookingChat.getSummary(req.params.id, req.user.id);
    return res.success(chat, 'Chat fetched successfully');
  } catch (error) {
    return mapServiceError(res, error, 'Failed to fetch chat');
  }
});

exports.getMessages = asyncHandler(async (req, res) => {
  try {
    const { messages, has_more, chat } = await bookingChat.getMessages({
      bookingId: req.params.id,
      userId: req.user.id,
      query: parseMessageQuery(req.query)
    });
    return res.success(messages, 'Messages fetched successfully', { chat, has_more });
  } catch (error) {
    return mapServiceError(res, error, 'Failed to fetch messages');
  }
});

exports.sendMessage = asyncHandler(async (req, res) => {
  try {
    const input = bookingChat.parseMessageInput(req);
    const result = await bookingChat.sendMessage({
      bookingId: req.params.id,
      sender: req.user,
      input
    });
    return res.created(result.message, 'Message sent successfully', { duplicate: result.duplicate });
  } catch (error) {
    return mapServiceError(res, error, 'Failed to send message');
  }
});

exports.markRead = asyncHandler(async (req, res) => {
  try {
    const result = await bookingChat.markRead({ bookingId: req.params.id, userId: req.user.id });
    return res.success(result, 'Messages marked as read');
  } catch (error) {
    return mapServiceError(res, error, 'Failed to mark messages as read');
  }
});
