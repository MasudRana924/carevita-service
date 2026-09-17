const pool = require('../config/database');

const DEFAULT_TYPES = [
  'BOOKING_CREATED',
  'BOOKING_ACCEPTED',
  'BOOKING_REJECTED',
  'BOOKING_REASSIGNED',
  'BOOKING_CANCELLED',
  'PAYMENT_RECEIVED',
  'SERVICE_STARTED',
  'SERVICE_COMPLETED',
  'SERVICE_START_REMINDER',
  'EARNING_SETTLED',
  'REVIEW_RECEIVED',
  'DISPUTE_UPDATED',
  'WITHDRAWAL_UPDATED',
  'EKYC_APPROVED',
  'EKYC_DECLINED',
  'GENERAL'
];

const getPreferences = async (userId) => {
  const result = await pool.query(
    'SELECT type, enabled FROM notification_preferences WHERE user_id = $1',
    [userId]
  );
  const map = Object.fromEntries(DEFAULT_TYPES.map((type) => [type, true]));
  for (const row of result.rows) {
    map[row.type] = row.enabled;
  }
  return map;
};

const isEnabled = async (userId, type) => {
  const result = await pool.query(
    'SELECT enabled FROM notification_preferences WHERE user_id = $1 AND type = $2',
    [userId, type]
  );
  if (!result.rows[0]) return true;
  return result.rows[0].enabled !== false;
};

const upsertPreferences = async (userId, types = {}) => {
  for (const [type, enabled] of Object.entries(types)) {
    await pool.query(
      `
      INSERT INTO notification_preferences (user_id, type, enabled, updated_at)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id, type)
      DO UPDATE SET enabled = EXCLUDED.enabled, updated_at = CURRENT_TIMESTAMP
      `,
      [userId, String(type).toUpperCase(), enabled !== false]
    );
  }
  return getPreferences(userId);
};

module.exports = {
  DEFAULT_TYPES,
  getPreferences,
  isEnabled,
  upsertPreferences
};
