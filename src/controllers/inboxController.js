const {
  findByUserId,
  countByUserId,
  findByIdForUser,
  markAsRead,
  markAllAsRead,
  getUnreadCount
} = require('../models/Inbox');
const { parsePagination } = require('../utils/pagination');

exports.listInbox = async (req, res) => {
  try {
    const { is_read, type } = req.query;
    const { page, limit, offset } = parsePagination(req.query);

    const [items, total, unread] = await Promise.all([
      findByUserId(req.user.id, {
        is_read,
        type,
        limit,
        offset
      }),
      countByUserId(req.user.id, { is_read, type }),
      getUnreadCount(req.user.id)
    ]);

    return res.paginated(items, { page, limit, total }, 'Inbox fetched successfully', { unread });
  } catch (error) {
    console.error('List inbox error:', error);
    return res.serverError('Failed to fetch inbox');
  }
};

exports.getInboxItem = async (req, res) => {
  try {
    const item = await findByIdForUser(req.params.id, req.user.id);
    if (!item) {
      return res.notFound('Inbox item not found');
    }
    return res.success(item, 'Inbox item fetched successfully');
  } catch (error) {
    console.error('Get inbox error:', error);
    return res.serverError('Failed to fetch inbox item');
  }
};

exports.markRead = async (req, res) => {
  try {
    const item = await markAsRead(req.params.id, req.user.id);
    if (!item) {
      return res.notFound('Inbox item not found');
    }
    return res.success(item, 'Marked as read');
  } catch (error) {
    console.error('Mark inbox read error:', error);
    return res.serverError('Failed to mark as read');
  }
};

exports.markAllRead = async (req, res) => {
  try {
    const items = await markAllAsRead(req.user.id);
    return res.success(items, 'All inbox items marked as read');
  } catch (error) {
    console.error('Mark all inbox read error:', error);
    return res.serverError('Failed to mark all as read');
  }
};

exports.unreadCount = async (req, res) => {
  try {
    const count = await getUnreadCount(req.user.id);
    return res.success({ unread: count }, 'Unread count fetched successfully');
  } catch (error) {
    console.error('Unread count error:', error);
    return res.serverError('Failed to get unread count');
  }
};
