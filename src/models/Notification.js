const pool = require('../config/database');

const createNotification = async ({
  user_id, title, message, type, reference_id = null, reference_type = null
}) => {
  const query = `
    INSERT INTO notifications (user_id, title, message, type, reference_id, reference_type)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `;
  const result = await pool.query(query, [
    user_id, title, message, type, reference_id, reference_type
  ]);
  return result.rows[0];
};

module.exports = { createNotification };
