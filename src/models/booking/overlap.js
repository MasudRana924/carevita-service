const pool = require('../../config/database');

const hasOverlap = async ({ providerId, bookingDate, startTime, endTime, excludeBookingId = null }) => {
  const result = await pool.query(
    `
    SELECT id FROM bookings
    WHERE provider_id = $1
      AND provider_type = 'CAREGIVER'
      AND booking_date = $2
      AND status IN ('PROVIDER_ASSIGNED', 'PROVIDER_ACCEPTED', 'PAYMENT_PAID', 'SERVICE_IN_PROGRESS')
      AND ($5::uuid IS NULL OR id <> $5)
      AND start_time < $4::time
      AND end_time > $3::time
    LIMIT 1
    `,
    [providerId, bookingDate, startTime, endTime, excludeBookingId]
  );
  return !!result.rows[0];
};

module.exports = { hasOverlap };
