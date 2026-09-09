const pool = require('../config/database');

const createNotificationToken = async (tokenData) => {
  const { user_id, device_id, platform, token } = tokenData;

  const query = `
    INSERT INTO notification_tokens (user_id, device_id, platform, token)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (user_id, device_id, platform) 
    DO UPDATE SET token = $4, is_active = true, updated_at = CURRENT_TIMESTAMP
    RETURNING *
  `;
  const values = [user_id, device_id, platform, token];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const getUserTokens = async (user_id) => {
  const query = `
    SELECT * FROM notification_tokens
    WHERE user_id = $1 AND is_active = true
    ORDER BY created_at DESC
  `;
  const result = await pool.query(query, [user_id]);
  return result.rows;
};

const deleteNotificationToken = async (id) => {
  const query = `
    UPDATE notification_tokens
    SET is_active = false, updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING *
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

const deleteTokenByDevice = async (user_id, device_id) => {
  const query = `
    UPDATE notification_tokens
    SET is_active = false, updated_at = CURRENT_TIMESTAMP
    WHERE user_id = $1 AND device_id = $2
    RETURNING *
  `;
  const result = await pool.query(query, [user_id, device_id]);
  return result.rows;
};

const deactivateAllUserTokens = async (user_id) => {
  const query = `
    UPDATE notification_tokens
    SET is_active = false, updated_at = CURRENT_TIMESTAMP
    WHERE user_id = $1
    RETURNING *
  `;
  const result = await pool.query(query, [user_id]);
  return result.rows;
};

module.exports = {
  createNotificationToken,
  getUserTokens,
  deleteNotificationToken,
  deleteTokenByDevice,
  deactivateAllUserTokens
};
