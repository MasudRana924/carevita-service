const { createNotificationToken, getUserTokens, deleteNotificationToken, deleteTokenByDevice, deactivateAllUserTokens } = require('../models/NotificationToken');

/**
 * Register notification token
 */
exports.registerToken = async (req, res) => {
  try {
    const { device_id, platform, token } = req.body;
    const userId = req.user.id;

    if (!device_id || !platform || !token) {
      return res.badRequest('device_id, platform, and token are required');
    }

    const normalizedPlatform = String(platform).trim().toUpperCase();
    const allowed = ['ANDROID', 'IOS', 'WEB'];
    if (!allowed.includes(normalizedPlatform)) {
      return res.badRequest('platform must be one of: android, ios, web');
    }

    const notificationToken = await createNotificationToken({
      user_id: userId,
      device_id: String(device_id).trim(),
      platform: normalizedPlatform,
      token: String(token).trim()
    });

    res.success(notificationToken, 'Notification token registered successfully');
  } catch (error) {
    console.error('Register token error:', error);
    res.serverError('Failed to register notification token');
  }
};

/**
 * Get user's notification tokens
 */
exports.getUserTokens = async (req, res) => {
  try {
    const userId = req.user.id;

    const tokens = await getUserTokens(userId);
    res.success(tokens);
  } catch (error) {
    console.error('Get tokens error:', error);
    res.serverError('Failed to get notification tokens');
  }
};

/**
 * Delete notification token
 */
exports.deleteToken = async (req, res) => {
  try {
    const { id } = req.params;

    const token = await deleteNotificationToken(id);
    if (!token) {
      return res.notFound('Notification token not found');
    }

    res.success(token, 'Notification token deleted successfully');
  } catch (error) {
    console.error('Delete token error:', error);
    res.serverError('Failed to delete notification token');
  }
};

/**
 * Delete token by device
 */
exports.deleteTokenByDevice = async (req, res) => {
  try {
    const { device_id } = req.params;
    const userId = req.user.id;

    const token = await deleteTokenByDevice(userId, device_id);
    if (!token) {
      return res.notFound('Notification token not found for this device');
    }

    res.success(token, 'Notification token deleted successfully');
  } catch (error) {
    console.error('Delete token by device error:', error);
    res.serverError('Failed to delete notification token');
  }
};

/**
 * Deactivate all user tokens (e.g., on logout)
 */
exports.deactivateAllTokens = async (req, res) => {
  try {
    const userId = req.user.id;

    const tokens = await deactivateAllUserTokens(userId);
    res.success(tokens, 'All notification tokens deactivated successfully');
  } catch (error) {
    console.error('Deactivate tokens error:', error);
    res.serverError('Failed to deactivate notification tokens');
  }
};
