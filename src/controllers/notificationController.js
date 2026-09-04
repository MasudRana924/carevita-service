const { findNotificationsByUserId, markNotificationAsRead, getUnreadNotificationCount, deleteNotification } = require('../models/Notification');

exports.getNotifications = async (req, res) => {
  try {
    const { is_read, type, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const notifications = await findNotificationsByUserId(req.user.id, {
      is_read: is_read === 'true' ? true : is_read === 'false' ? false : undefined,
      type,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    const unreadCount = await getUnreadNotificationCount(req.user.id);

    res.success({
      notifications,
      unreadCount
    }, null, {
      page: parseInt(page),
      limit: parseInt(limit),
      total: notifications.length
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.serverError('Failed to fetch notifications');
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await markNotificationAsRead(id);

    res.success(notification, 'Notification marked as read');
  } catch (error) {
    console.error('Mark as read error:', error);
    res.serverError('Failed to mark as read');
  }
};

exports.markAllAsRead = async (req, res) => {
  try {
    const { markAllNotificationsAsRead } = require('../models/Notification');
    await markAllNotificationsAsRead(req.user.id);

    res.success(null, 'All notifications marked as read');
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.serverError('Failed to mark all as read');
  }
};

exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;

    await deleteNotification(id);

    res.success(null, 'Notification deleted successfully');
  } catch (error) {
    console.error('Delete notification error:', error);
    res.serverError('Failed to delete notification');
  }
};
