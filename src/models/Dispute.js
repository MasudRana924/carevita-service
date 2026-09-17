const pool = require('../config/database');

const createDispute = async ({ bookingId, raisedBy, role, reason, details }) => {
  const result = await pool.query(
    `
    INSERT INTO disputes (booking_id, raised_by, role, reason, details, status)
    VALUES ($1, $2, $3, $4, $5, 'OPEN')
    RETURNING *
    `,
    [bookingId, raisedBy, role, reason, details || null]
  );
  return result.rows[0];
};

const findById = async (id) => {
  const result = await pool.query(
    `
    SELECT d.*, u.name as raised_by_name, b.booking_number
    FROM disputes d
    JOIN users u ON u.id = d.raised_by
    JOIN bookings b ON b.id = d.booking_id
    WHERE d.id = $1
    `,
    [id]
  );
  return result.rows[0] || null;
};

const findOpenByBookingId = async (bookingId) => {
  const result = await pool.query(
    `
    SELECT * FROM disputes
    WHERE booking_id = $1 AND status IN ('OPEN', 'IN_REVIEW')
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [bookingId]
  );
  return result.rows[0] || null;
};

const listByBookingId = async (bookingId) => {
  const result = await pool.query(
    'SELECT * FROM disputes WHERE booking_id = $1 ORDER BY created_at DESC',
    [bookingId]
  );
  return result.rows;
};

const listAll = async ({ status, limit = 20, offset = 0 } = {}) => {
  const values = [];
  let where = 'WHERE 1=1';
  if (status) {
    values.push(status);
    where += ` AND d.status = $${values.length}`;
  }
  const list = await pool.query(
    `
    SELECT d.*, u.name as raised_by_name, b.booking_number
    FROM disputes d
    JOIN users u ON u.id = d.raised_by
    JOIN bookings b ON b.id = d.booking_id
    ${where}
    ORDER BY d.created_at DESC
    LIMIT $${values.length + 1} OFFSET $${values.length + 2}
    `,
    [...values, limit, offset]
  );
  const count = await pool.query(
    `SELECT COUNT(*)::int AS count FROM disputes d ${where}`,
    values
  );
  return { items: list.rows, total: count.rows[0].count };
};

const updateDispute = async (id, { status, resolution, resolvedBy }) => {
  const result = await pool.query(
    `
    UPDATE disputes
    SET status = COALESCE($1, status),
        resolution = COALESCE($2, resolution),
        resolved_by = COALESCE($3, resolved_by),
        resolved_at = CASE WHEN $1 IN ('RESOLVED', 'REJECTED') THEN CURRENT_TIMESTAMP ELSE resolved_at END,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $4
    RETURNING *
    `,
    [status || null, resolution || null, resolvedBy || null, id]
  );
  return result.rows[0];
};

module.exports = {
  createDispute,
  findById,
  findOpenByBookingId,
  listByBookingId,
  listAll,
  updateDispute
};
