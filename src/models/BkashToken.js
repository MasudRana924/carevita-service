const pool = require('../config/database');

const upsertToken = async (userId, idToken, expiresAt) => {
  const result = await pool.query(
    `
    INSERT INTO bkash_tokens (user_id, id_token, expires_at)
    VALUES ($1, $2, $3)
    ON CONFLICT (user_id)
    DO UPDATE SET
      id_token = EXCLUDED.id_token,
      expires_at = EXCLUDED.expires_at,
      updated_at = CURRENT_TIMESTAMP
    RETURNING *
    `,
    [userId, idToken, expiresAt]
  );
  return result.rows[0];
};

const findByUserId = async (userId) => {
  const result = await pool.query(
    'SELECT * FROM bkash_tokens WHERE user_id = $1',
    [userId]
  );
  return result.rows[0] || null;
};

const getValidToken = async (userId) => {
  const row = await findByUserId(userId);
  if (!row || !row.id_token) return null;
  if (row.expires_at && new Date(row.expires_at) <= new Date()) return null;
  return row.id_token;
};

module.exports = {
  upsertToken,
  findByUserId,
  getValidToken
};
