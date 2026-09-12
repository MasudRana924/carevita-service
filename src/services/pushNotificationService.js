const {
  createInboxItem
} = require('../models/Inbox');
const { getUserTokens } = require('../models/NotificationToken');
const { getFirebaseMessaging } = require('../config/firebase');

/**
 * Save inbox row + send FCM push (best-effort).
 * data payload always includes booking_id / inbox_id as strings for deep-link.
 */
const notifyUser = async ({
  userId,
  title,
  body,
  type = 'GENERAL',
  bookingId = null,
  referenceId = null,
  referenceType = null,
  data = {},
  extraData = {}
}) => {
  const payloadData = { ...(data || {}), ...(extraData || {}) };
  if (bookingId != null) {
    payloadData.booking_id = String(bookingId);
  }

  const inbox = await createInboxItem({
    user_id: userId,
    title,
    body,
    type,
    reference_id: referenceId || bookingId || null,
    reference_type: referenceType || (bookingId ? 'booking' : null),
    data: payloadData
  });

  const tokenRows = await getUserTokens(userId);
  const tokens = tokenRows.map((row) => row.token).filter(Boolean);
  let push = { attempted: false, successCount: 0, failureCount: 0 };

  if (tokens.length > 0) {
    try {
      const messaging = getFirebaseMessaging();
      const response = await messaging.sendEachForMulticast({
        tokens,
        notification: { title, body },
        data: {
          type: String(type),
          booking_id: bookingId != null ? String(bookingId) : '',
          inbox_id: String(inbox.id),
          ...Object.fromEntries(
            Object.entries(payloadData).map(([k, v]) => [String(k), String(v ?? '')])
          )
        }
      });
      push = {
        attempted: true,
        successCount: response.successCount,
        failureCount: response.failureCount
      };
    } catch (err) {
      console.error('FCM send failed:', err.message);
      push = { attempted: true, successCount: 0, failureCount: tokens.length, error: err.message };
    }
  }

  return { inbox, push };
};

module.exports = {
  notifyUser
};
