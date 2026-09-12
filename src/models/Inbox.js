const pool = require('../config/database');

const createInboxItem = async ({
  user_id,
  title,
  body,
  type,
  reference_id = null,
  reference_type = null,
  data = {}
}) => {
  const query = `
    INSERT INTO inbox (user_id, title, body, type, reference_id, reference_type, data)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `;
  const values = [
    user_id,
    title,
    body,
    type,
    reference_id,
    reference_type,
    JSON.stringify(data || {})
  ];
  const result = await pool.query(query, values);
  return result.rows[0];
};

const findByUserId = async (user_id, filters = {}) => {
  let query = `
    SELECT * FROM inbox
    WHERE user_id = $1
  `;
  const values = [user_id];
  let paramCount = 1;

  if (filters.is_read !== undefined) {
    paramCount++;
    query += ` AND is_read = $${paramCount}`;
    values.push(filters.is_read === true || filters.is_read === 'true');
  }

  if (filters.type) {
    paramCount++;
    query += ` AND type = $${paramCount}`;
    values.push(filters.type);
  }

  query += ' ORDER BY created_at DESC';

  if (filters.limit) {
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    values.push(parseInt(filters.limit));
  }

  if (filters.offset) {
    paramCount++;
    query += ` OFFSET $${paramCount}`;
    values.push(parseInt(filters.offset));
  }

  const result = await pool.query(query, values);
  return result.rows;
};

const findByIdForUser = async (id, user_id) => {
  const result = await pool.query(
    'SELECT * FROM inbox WHERE id = $1 AND user_id = $2',
    [id, user_id]
  );
  return result.rows[0];
};

const markAsRead = async (id, user_id) => {
  const result = await pool.query(
    `UPDATE inbox SET is_read = true, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND user_id = $2
     RETURNING *`,
    [id, user_id]
  );
  return result.rows[0];
};

const markAllAsRead = async (user_id) => {
  const result = await pool.query(
    `UPDATE inbox SET is_read = true, updated_at = CURRENT_TIMESTAMP
     WHERE user_id = $1 AND is_read = false
     RETURNING *`,
    [user_id]
  );
  return result.rows;
};

const getUnreadCount = async (user_id) => {
  const result = await pool.query(
    'SELECT COUNT(*)::int AS count FROM inbox WHERE user_id = $1 AND is_read = false',
    [user_id]
  );
  return result.rows[0].count;
};

module.exports = {
  createInboxItem,
  findByUserId,
  findByIdForUser,
  markAsRead,
  markAllAsRead,
  getUnreadCount
};
