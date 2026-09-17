const {
  createInboxItem
} = require('../models/Inbox');
const { getUserTokens, deactivateByTokens } = require('../models/NotificationToken');
const { isEnabled } = require('../models/NotificationPreference');
const { getFirebaseMessaging } = require('../config/firebase');

const INVALID_FCM_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
  'messaging/invalid-argument'
]);

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

  const pushEnabled = await isEnabled(userId, type);
  let push = { attempted: false, successCount: 0, failureCount: 0, muted: !pushEnabled };

  if (!pushEnabled) {
    return { inbox, push };
  }

  const tokenRows = await getUserTokens(userId);
  const tokens = tokenRows.map((row) => row.token).filter(Boolean);

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

      const invalidTokens = [];
      (response.responses || []).forEach((item, index) => {
        const code = item.error?.code;
        if (!item.success && INVALID_FCM_CODES.has(code)) {
          invalidTokens.push(tokens[index]);
        }
      });
      if (invalidTokens.length) {
        await deactivateByTokens(invalidTokens);
      }

      push = {
        attempted: true,
        successCount: response.successCount,
        failureCount: response.failureCount,
        cleaned: invalidTokens.length
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
