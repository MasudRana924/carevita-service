const NotificationPreference = require('../models/NotificationPreference');

exports.getPreferences = async (req, res) => {
  try {
    const preferences = await NotificationPreference.getPreferences(req.user.id);
    return res.success(preferences, 'Notification preferences fetched successfully');
  } catch (error) {
    console.error('Get notification preferences error:', error);
    return res.serverError('Failed to fetch preferences');
  }
};

exports.updatePreferences = async (req, res) => {
  try {
    const types = req.body.types || req.body;
    if (!types || typeof types !== 'object' || Array.isArray(types)) {
      return res.badRequest('Send a map of notification types to true/false');
    }
    const preferences = await NotificationPreference.upsertPreferences(req.user.id, types);
    return res.success(preferences, 'Notification preferences updated');
  } catch (error) {
    console.error('Update notification preferences error:', error);
    return res.serverError('Failed to update preferences');
  }
};
