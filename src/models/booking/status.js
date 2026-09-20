const pool = require('../../config/database');
const { ACCEPT_OFFER_TIMEOUT_MINUTES } = require('../../config/platform');

const updateBooking = async (id, bookingData) => {
  const {
    provider_id, booking_date, start_time, end_time, duration_hours,
    notes, service_charge,
    platform_fee, discount, total_amount, advance_percentage,
    advance_amount, remaining_amount
  } = bookingData;

  const query = `
    UPDATE bookings
    SET provider_id = COALESCE($1, provider_id),
        booking_date = COALESCE($2, booking_date),
        start_time = COALESCE($3, start_time),
        end_time = COALESCE($4, end_time),
        duration_hours = COALESCE($5, duration_hours),
        notes = COALESCE($6, notes),
        service_charge = COALESCE($7, service_charge),
        platform_fee = COALESCE($8, platform_fee),
        discount = COALESCE($9, discount),
        total_amount = COALESCE($10, total_amount),
        advance_percentage = COALESCE($11, advance_percentage),
        advance_amount = COALESCE($12, advance_amount),
        remaining_amount = COALESCE($13, remaining_amount),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $14
    RETURNING *
  `;
  const values = [
    provider_id, booking_date, start_time, end_time, duration_hours,
    notes, service_charge,
    platform_fee, discount, total_amount, advance_percentage,
    advance_amount, remaining_amount, id
  ];
  const result = await pool.query(query, values);
  return result.rows[0];
};

const updateStatus = async (id, status) => {
  const result = await pool.query(
    `UPDATE bookings SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
    [status, id]
  );
  return result.rows[0];
};

const clearProvider = async (id, status = 'SEARCHING_PROVIDER') => {
  const result = await pool.query(
    `
    UPDATE bookings
    SET provider_id = NULL,
        status = $1,
        offer_expires_at = NULL,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING *
    `,
    [status, id]
  );
  return result.rows[0];
};

const assignProvider = async (id, providerId, status = 'PROVIDER_ASSIGNED') => {
  const minutes = Math.max(1, ACCEPT_OFFER_TIMEOUT_MINUTES || 15);
  const result = await pool.query(
    `
    UPDATE bookings
    SET provider_id = $1,
        status = $2,
        offer_expires_at = CURRENT_TIMESTAMP + ($3::text || ' minutes')::interval,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $4
    RETURNING *
    `,
    [providerId, status, String(minutes), id]
  );
  return result.rows[0];
};

const setOfferExpiry = async (id, minutes = ACCEPT_OFFER_TIMEOUT_MINUTES) => {
  const mins = Math.max(1, minutes || 15);
  const result = await pool.query(
    `
    UPDATE bookings
    SET offer_expires_at = CURRENT_TIMESTAMP + ($2::text || ' minutes')::interval,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING *
    `,
    [id, String(mins)]
  );
  return result.rows[0];
};

const clearOfferExpiry = async (id) => {
  const result = await pool.query(
    `
    UPDATE bookings
    SET offer_expires_at = NULL, updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING *
    `,
    [id]
  );
  return result.rows[0];
};

const updatePaymentStatus = async (id, payment_status, payment_method = null) => {
  const paidStatus = String(payment_status).toUpperCase() === 'PAID' ? 'PAYMENT_PAID' : null;
  const result = await pool.query(
    `
    UPDATE bookings
    SET payment_status = $1,
        payment_method = COALESCE($3, payment_method),
        status = COALESCE($4, status),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING *
    `,
    [payment_status, id, payment_method, paidStatus]
  );
  return result.rows[0];
};

const cancel = async (id, cancellation_reason, cancelled_by) => {
  const status = cancelled_by === 'CANCELLED_BY_PROVIDER' || cancelled_by === 'CANCELLED_BY_ADMIN'
    ? cancelled_by
    : 'CANCELLED_BY_USER';
  const result = await pool.query(
    `
    UPDATE bookings
    SET status = $1, cancellation_reason = $2, cancelled_by = $3,
        cancelled_at = CURRENT_TIMESTAMP, offer_expires_at = NULL,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $4
    RETURNING *
    `,
    [status, cancellation_reason, cancelled_by, id]
  );
  return result.rows[0];
};

const startService = async (id) => {
  const result = await pool.query(
    `
    UPDATE bookings
    SET status = 'SERVICE_IN_PROGRESS',
        started_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING *
    `,
    [id]
  );
  return result.rows[0];
};

const complete = async (id) => {
  const result = await pool.query(
    `
    UPDATE bookings
    SET status = 'SERVICE_COMPLETED', completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING *
    `,
    [id]
  );
  return result.rows[0];
};

const addStatusHistory = async (booking_id, from_status, to_status, changed_by, notes, location_lat, location_long) => {
  const result = await pool.query(
    `
    INSERT INTO booking_status_history (booking_id, from_status, to_status, changed_by, notes, location_lat, location_long)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
    `,
    [booking_id, from_status, to_status, changed_by, notes, location_lat, location_long]
  );
  return result.rows[0];
};

const getStatusHistory = async (booking_id) => {
  const result = await pool.query(
    `SELECT * FROM booking_status_history WHERE booking_id = $1 ORDER BY created_at ASC`,
    [booking_id]
  );
  return result.rows;
};

const addRejection = async (bookingId, caregiverProfileId, reason = null) => {
  await pool.query(
    `
    INSERT INTO booking_provider_rejections (booking_id, caregiver_profile_id, reason)
    VALUES ($1, $2, $3)
    ON CONFLICT (booking_id, caregiver_profile_id) DO UPDATE SET reason = EXCLUDED.reason
    `,
    [bookingId, caregiverProfileId, reason]
  );
};

const listRejectedIds = async (bookingId) => {
  const result = await pool.query(
    'SELECT caregiver_profile_id FROM booking_provider_rejections WHERE booking_id = $1',
    [bookingId]
  );
  return result.rows.map((row) => row.caregiver_profile_id);
};

module.exports = {
  updateBooking,
  updateStatus,
  clearProvider,
  assignProvider,
  setOfferExpiry,
  clearOfferExpiry,
  updatePaymentStatus,
  cancel,
  startService,
  complete,
  addStatusHistory,
  getStatusHistory,
  addRejection,
  listRejectedIds
};
