const pool = require('../config/database');

const createWithdrawal = async ({
  caregiverUserId,
  walletId,
  amount,
  method,
  deliveryDetails,
  bkashNumber
}) => {
  const result = await pool.query(
    `
    INSERT INTO withdrawals (
      caregiver_user_id,
      wallet_id,
      amount,
      method,
      delivery_details,
      bkash_number,
      status
    )
    VALUES ($1, $2, $3, $4, $5::jsonb, $6, 'PENDING')
    RETURNING *
    `,
    [
      caregiverUserId,
      walletId,
      amount,
      method,
      JSON.stringify(deliveryDetails || {}),
      bkashNumber || null
    ]
  );
  return result.rows[0];
};

const findById = async (id) => {
  const result = await pool.query('SELECT * FROM withdrawals WHERE id = $1', [id]);
  return result.rows[0] || null;
};

const listByUser = async (userId, { limit = 20, offset = 0 } = {}) => {
  const result = await pool.query(
    `
    SELECT * FROM withdrawals
    WHERE caregiver_user_id = $1
    ORDER BY created_at DESC
    LIMIT $2 OFFSET $3
    `,
    [userId, limit, offset]
  );
  return result.rows;
};

const countByUser = async (userId) => {
  const result = await pool.query(
    'SELECT COUNT(*)::int AS count FROM withdrawals WHERE caregiver_user_id = $1',
    [userId]
  );
  return result.rows[0].count;
};

const listAll = async ({ status, limit = 20, offset = 0 } = {}) => {
  const values = [];
  let where = 'WHERE 1=1';
  if (status) {
    values.push(status);
    where += ` AND status = $${values.length}`;
  }
  const list = await pool.query(
    `
    SELECT w.*, u.name as caregiver_name, u.phone as caregiver_phone
    FROM withdrawals w
    JOIN users u ON u.id = w.caregiver_user_id
    ${where}
    ORDER BY w.created_at DESC
    LIMIT $${values.length + 1} OFFSET $${values.length + 2}
    `,
    [...values, limit, offset]
  );
  const count = await pool.query(
    `SELECT COUNT(*)::int AS count FROM withdrawals w ${where}`,
    values
  );
  return { items: list.rows, total: count.rows[0].count };
};

const updateStatus = async (id, { status, adminNote, processedBy }) => {
  const result = await pool.query(
    `
    UPDATE withdrawals
    SET status = $1,
        admin_note = COALESCE($2, admin_note),
        processed_by = COALESCE($3, processed_by),
        processed_at = CASE WHEN $1 IN ('APPROVED', 'REJECTED', 'COMPLETED', 'FAILED') THEN CURRENT_TIMESTAMP ELSE processed_at END,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $4
    RETURNING *
    `,
    [status, adminNote || null, processedBy || null, id]
  );
  return result.rows[0];
};

const hasPending = async (userId) => {
  const result = await pool.query(
    `
    SELECT 1 FROM withdrawals
    WHERE caregiver_user_id = $1 AND status IN ('PENDING', 'APPROVED')
    LIMIT 1
    `,
    [userId]
  );
  return result.rowCount > 0;
};

module.exports = {
  createWithdrawal,
  findById,
  listByUser,
  countByUser,
  listAll,
  updateStatus,
  hasPending
};
