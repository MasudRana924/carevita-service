const pool = require('../config/database');

const createIncident = async ({ bookingId, reportedBy, description }) => {
  const result = await pool.query(
    `
    INSERT INTO safety_incidents (booking_id, reported_by, description, status)
    VALUES ($1, $2, $3, 'OPEN')
    RETURNING *
    `,
    [bookingId, reportedBy, description]
  );
  return result.rows[0];
};

const findById = async (id) => {
  const result = await pool.query(`SELECT * FROM safety_incidents WHERE id = $1`, [id]);
  return result.rows[0] || null;
};

const listOpen = async ({ limit = 50, offset = 0 } = {}) => {
  const result = await pool.query(
    `
    SELECT s.*, b.booking_number, u.name as reporter_name
    FROM safety_incidents s
    JOIN bookings b ON b.id = s.booking_id
    JOIN users u ON u.id = s.reported_by
    ORDER BY s.created_at DESC
    LIMIT $1 OFFSET $2
    `,
    [limit, offset]
  );
  return result.rows;
};

const updateStatus = async (id, { status, adminNote, resolvedBy }) => {
  const result = await pool.query(
    `
    UPDATE safety_incidents
    SET status = COALESCE($1, status),
        admin_note = COALESCE($2, admin_note),
        resolved_by = COALESCE($3, resolved_by),
        resolved_at = CASE WHEN $1 IN ('RESOLVED', 'DISMISSED') THEN CURRENT_TIMESTAMP ELSE resolved_at END,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $4
    RETURNING *
    `,
    [status, adminNote || null, resolvedBy || null, id]
  );
  return result.rows[0];
};

module.exports = {
  createIncident,
  findById,
  listOpen,
  updateStatus
};
