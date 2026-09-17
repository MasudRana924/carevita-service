const pool = require('../config/database');

const upsertSession = async ({
  userId,
  sessionId,
  sessionToken,
  verificationUrl,
  status,
  vendorData
}) => {
  const result = await pool.query(
    `
    INSERT INTO ekyc_sessions (
      user_id, session_id, session_token, verification_url, status, vendor_data
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (session_id) DO UPDATE SET
      session_token = COALESCE(EXCLUDED.session_token, ekyc_sessions.session_token),
      verification_url = COALESCE(EXCLUDED.verification_url, ekyc_sessions.verification_url),
      status = COALESCE(EXCLUDED.status, ekyc_sessions.status),
      vendor_data = COALESCE(EXCLUDED.vendor_data, ekyc_sessions.vendor_data),
      updated_at = CURRENT_TIMESTAMP
    RETURNING *
    `,
    [userId, sessionId, sessionToken || null, verificationUrl || null, status || 'Not Started', vendorData || null]
  );
  return result.rows[0];
};

const findBySessionId = async (sessionId) => {
  const result = await pool.query(
    'SELECT * FROM ekyc_sessions WHERE session_id = $1',
    [sessionId]
  );
  return result.rows[0] || null;
};

const findLatestByUserId = async (userId) => {
  const result = await pool.query(
    `
    SELECT * FROM ekyc_sessions
    WHERE user_id = $1
    ORDER BY updated_at DESC
    LIMIT 1
    `,
    [userId]
  );
  return result.rows[0] || null;
};

const updateStatus = async (sessionId, { status, lastEventId } = {}) => {
  const result = await pool.query(
    `
    UPDATE ekyc_sessions
    SET status = COALESCE($1, status),
        last_event_id = COALESCE($2, last_event_id),
        updated_at = CURRENT_TIMESTAMP
    WHERE session_id = $3
    RETURNING *
    `,
    [status || null, lastEventId || null, sessionId]
  );
  return result.rows[0] || null;
};

const claimWebhookEvent = async ({ eventId, sessionId, webhookType }) => {
  if (!eventId) return true;
  const result = await pool.query(
    `
    INSERT INTO ekyc_webhook_events (event_id, session_id, webhook_type)
    VALUES ($1, $2, $3)
    ON CONFLICT (event_id) DO NOTHING
    RETURNING event_id
    `,
    [eventId, sessionId || null, webhookType || null]
  );
  return result.rows.length > 0;
};

module.exports = {
  upsertSession,
  findBySessionId,
  findLatestByUserId,
  updateStatus,
  claimWebhookEvent
};
