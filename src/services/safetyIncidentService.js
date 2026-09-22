const SafetyIncident = require('../models/SafetyIncident');
const { findById } = require('../models/Booking');
const pool = require('../config/database');
const { writeAudit } = require('../utils/audit');
const { notifyUser } = require('./pushNotificationService');

const SUPPORT_HOTLINE = process.env.SUPPORT_HOTLINE || 'Contact CareMate support via in-app inbox';

/**
 * USER reports a safety incident on their booking.
 * Freezes payout on the booking; alerts admins via audit (ops poll /admin later).
 * Does NOT claim emergency dispatch.
 */
const reportSafetyIncident = async ({ bookingId, user, description }) => {
  if (!description || String(description).trim().length < 5) {
    const error = new Error('description is required (min 5 characters)');
    error.statusCode = 400;
    throw error;
  }

  const booking = await findById(bookingId);
  if (!booking) {
    const error = new Error('Booking not found');
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }
  if (booking.user_id !== user.id && user.role !== 'ADMIN') {
    const error = new Error('Access denied');
    error.statusCode = 403;
    throw error;
  }

  // One open incident per booking — avoid spam / duplicate freezes
  const existingOpen = await pool.query(
    `
    SELECT * FROM safety_incidents
    WHERE booking_id = $1 AND status = 'OPEN'
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [booking.id]
  );
  if (existingOpen.rows[0]) {
    return {
      incident: existingOpen.rows[0],
      payout_frozen: true,
      support: SUPPORT_HOTLINE,
      duplicate: true,
      disclaimer: 'CareMate is not an emergency service. If you are in immediate danger, contact local emergency services.'
    };
  }

  let incident;
  try {
    incident = await SafetyIncident.createIncident({
      bookingId: booking.id,
      reportedBy: user.id,
      description: String(description).trim().slice(0, 2000)
    });
  } catch (err) {
    // Concurrent duplicate OPEN (unique partial index)
    if (err.code === '23505') {
      const again = await pool.query(
        `SELECT * FROM safety_incidents WHERE booking_id = $1 AND status = 'OPEN' LIMIT 1`,
        [booking.id]
      );
      if (again.rows[0]) {
        return {
          incident: again.rows[0],
          payout_frozen: true,
          support: SUPPORT_HOTLINE,
          duplicate: true,
          disclaimer: 'CareMate is not an emergency service. If you are in immediate danger, contact local emergency services.'
        };
      }
    }
    throw err;
  }

  try {
    await pool.query(
      `UPDATE bookings SET payout_frozen = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [booking.id]
    );
  } catch (err) {
    if (err.code !== '42703') throw err;
    // Column missing until migrate:sql — incident still recorded
  }

  await writeAudit({
    actorId: user.id,
    action: 'SAFETY_INCIDENT_CREATED',
    entityType: 'safety_incident',
    entityId: incident.id,
    meta: { booking_id: booking.id, booking_number: booking.booking_number }
  });

  try {
    await notifyUser({
      userId: booking.user_id,
      title: 'Safety report received',
      body: `We received your report for ${booking.booking_number}. ${SUPPORT_HOTLINE}`,
      type: 'SAFETY_INCIDENT',
      bookingId: booking.id,
      referenceId: incident.id,
      referenceType: 'safety_incident',
      extraData: { screen: 'support', support: SUPPORT_HOTLINE }
    });
  } catch (e) {
    console.error('Safety notify failed:', e.message);
  }

  return {
    incident,
    payout_frozen: true,
    support: SUPPORT_HOTLINE,
    disclaimer: 'CareMate is not an emergency service. If you are in immediate danger, contact local emergency services.'
  };
};

const listIncidentsForAdmin = async ({ status, page = 1, limit = 20 } = {}) => {
  const offset = (page - 1) * limit;
  const values = [];
  let where = 'WHERE 1=1';
  if (status) {
    values.push(status);
    where += ` AND s.status = $${values.length}`;
  }
  const list = await pool.query(
    `
    SELECT s.*, b.booking_number, b.payout_frozen, u.name as reporter_name
    FROM safety_incidents s
    JOIN bookings b ON b.id = s.booking_id
    JOIN users u ON u.id = s.reported_by
    ${where}
    ORDER BY s.created_at DESC
    LIMIT $${values.length + 1} OFFSET $${values.length + 2}
    `,
    [...values, limit, offset]
  );
  const count = await pool.query(
    `SELECT COUNT(*)::int AS count FROM safety_incidents s ${where}`,
    values
  );
  return { items: list.rows, total: count.rows[0].count };
};

const resolveIncident = async ({ incidentId, admin, status, adminNote, unfreezePayout = false }) => {
  const allowed = ['OPEN', 'IN_REVIEW', 'RESOLVED', 'DISMISSED'];
  if (!allowed.includes(status)) {
    const error = new Error(`status must be one of: ${allowed.join(', ')}`);
    error.statusCode = 400;
    throw error;
  }

  const existing = await SafetyIncident.findById(incidentId);
  if (!existing) {
    const error = new Error('Safety incident not found');
    error.statusCode = 404;
    throw error;
  }

  const updated = await SafetyIncident.updateStatus(incidentId, {
    status,
    adminNote,
    resolvedBy: admin.id
  });

  if (unfreezePayout && ['RESOLVED', 'DISMISSED'].includes(status)) {
    try {
      await pool.query(
        `UPDATE bookings SET payout_frozen = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [existing.booking_id]
      );
    } catch (err) {
      if (err.code !== '42703') throw err;
    }
  }

  await writeAudit({
    actorId: admin.id,
    action: 'SAFETY_INCIDENT_UPDATED',
    entityType: 'safety_incident',
    entityId: incidentId,
    meta: { status, unfreezePayout: !!unfreezePayout }
  });

  return updated;
};

module.exports = {
  reportSafetyIncident,
  listIncidentsForAdmin,
  resolveIncident,
  SUPPORT_HOTLINE
};
