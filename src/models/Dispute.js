const pool = require('../config/database');

const createDispute = async (disputeData) => {
  const { booking_id, raised_by, dispute_type, description } = disputeData;
  const dispute_number = `DP${Date.now()}${Math.floor(Math.random() * 1000)}`;

  const query = `
    INSERT INTO disputes (dispute_number, booking_id, raised_by, dispute_type, description)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `;
  const values = [dispute_number, booking_id, raised_by, dispute_type, description];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const getDisputeById = async (id) => {
  const query = `
    SELECT d.*, b.booking_number, u.name as raised_by_name
    FROM disputes d
    LEFT JOIN bookings b ON d.booking_id = b.id
    LEFT JOIN users u ON d.raised_by = u.id
    WHERE d.id = $1
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

const getDisputeByBookingId = async (booking_id) => {
  const query = `
    SELECT * FROM disputes WHERE booking_id = $1
    ORDER BY created_at DESC
  `;
  const result = await pool.query(query, [booking_id]);
  return result.rows[0];
};

const updateDispute = async (id, disputeData) => {
  const { status, resolution, resolution_type, refund_amount, resolved_by } = disputeData;

  const query = `
    UPDATE disputes
    SET status = COALESCE($1, status),
        resolution = COALESCE($2, resolution),
        resolution_type = COALESCE($3, resolution_type),
        refund_amount = COALESCE($4, refund_amount),
        resolved_by = COALESCE($5, resolved_by),
        resolved_at = CASE WHEN $1 IN ('RESOLVED', 'REJECTED') THEN CURRENT_TIMESTAMP ELSE resolved_at END,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $6
    RETURNING *
  `;
  const values = [status, resolution, resolution_type, refund_amount, resolved_by, id];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const getAllDisputes = async (filters = {}) => {
  let query = `
    SELECT d.*, b.booking_number, u.name as raised_by_name, r.name as resolved_by_name
    FROM disputes d
    LEFT JOIN bookings b ON d.booking_id = b.id
    LEFT JOIN users u ON d.raised_by = u.id
    LEFT JOIN users r ON d.resolved_by = r.id
    WHERE 1=1
  `;
  const values = [];
  let paramCount = 0;

  if (filters.status) {
    paramCount++;
    query += ` AND d.status = $${paramCount}`;
    values.push(filters.status);
  }

  if (filters.dispute_type) {
    paramCount++;
    query += ` AND d.dispute_type = $${paramCount}`;
    values.push(filters.dispute_type);
  }

  query += ' ORDER BY d.created_at DESC';

  if (filters.limit) {
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    values.push(filters.limit);
  }

  if (filters.offset) {
    paramCount++;
    query += ` OFFSET $${paramCount}`;
    values.push(filters.offset);
  }

  const result = await pool.query(query, values);
  return result.rows;
};

module.exports = {
  createDispute,
  getDisputeById,
  getDisputeByBookingId,
  updateDispute,
  getAllDisputes
};
