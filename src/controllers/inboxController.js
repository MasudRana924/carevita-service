const {
  findByUserId,
  findByIdForUser,
  markAsRead,
  markAllAsRead,
  getUnreadCount
} = require('../models/Inbox');

exports.listInbox = async (req, res) => {
  try {
    const { page = 1, limit = 20, is_read, type } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const items = await findByUserId(req.user.id, {
      is_read,
      type,
      limit: parseInt(limit),
      offset
    });
    const unread = await getUnreadCount(req.user.id);

    res.success(items, null, {
      page: parseInt(page),
      limit: parseInt(limit),
      total: items.length,
      unread
    });
  } catch (error) {
    console.error('List inbox error:', error);
    res.serverError('Failed to fetch inbox');
  }
};

exports.getInboxItem = async (req, res) => {
  try {
    const item = await findByIdForUser(req.params.id, req.user.id);
    if (!item) {
      return res.notFound('Inbox item not found');
    }
    res.success(item);
  } catch (error) {
    console.error('Get inbox error:', error);
    res.serverError('Failed to fetch inbox item');
  }
};

exports.markRead = async (req, res) => {
  try {
    const item = await markAsRead(req.params.id, req.user.id);
    if (!item) {
      return res.notFound('Inbox item not found');
    }
    res.success(item, 'Marked as read');
  } catch (error) {
    console.error('Mark inbox read error:', error);
    res.serverError('Failed to mark as read');
  }
};

exports.markAllRead = async (req, res) => {
  try {
    const items = await markAllAsRead(req.user.id);
    res.success(items, 'All inbox items marked as read');
  } catch (error) {
    console.error('Mark all inbox read error:', error);
    res.serverError('Failed to mark all as read');
  }
};

exports.unreadCount = async (req, res) => {
  try {
    const count = await getUnreadCount(req.user.id);
    res.success({ unread: count });
  } catch (error) {
    console.error('Unread count error:', error);
    res.serverError('Failed to get unread count');
  }
};
