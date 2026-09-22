const pool = require('../config/database');

const upsertLocation = async ({
  bookingId,
  caregiverUserId,
  latitude,
  longitude,
  accuracy = null,
  heading = null,
  speed = null,
  isActive = true
}) => {
  const result = await pool.query(
    `
    INSERT INTO booking_live_locations (
      booking_id, caregiver_user_id, latitude, longitude,
      accuracy, heading, speed, is_active, updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
    ON CONFLICT (booking_id) DO UPDATE SET
      caregiver_user_id = EXCLUDED.caregiver_user_id,
      latitude = EXCLUDED.latitude,
      longitude = EXCLUDED.longitude,
      accuracy = EXCLUDED.accuracy,
      heading = EXCLUDED.heading,
      speed = EXCLUDED.speed,
      is_active = EXCLUDED.is_active,
      updated_at = CURRENT_TIMESTAMP
    RETURNING *
    `,
    [bookingId, caregiverUserId, latitude, longitude, accuracy, heading, speed, isActive]
  );
  return result.rows[0];
};

const getByBookingId = async (bookingId) => {
  const result = await pool.query(
    'SELECT * FROM booking_live_locations WHERE booking_id = $1',
    [bookingId]
  );
  return result.rows[0] || null;
};

const deactivate = async (bookingId) => {
  const result = await pool.query(
    `
    UPDATE booking_live_locations
    SET is_active = false, updated_at = CURRENT_TIMESTAMP
    WHERE booking_id = $1
    RETURNING *
    `,
    [bookingId]
  );
  return result.rows[0] || null;
};

module.exports = {
  upsertLocation,
  getByBookingId,
  deactivate
};
