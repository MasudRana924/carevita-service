const pool = require('../config/database');

const createReview = async ({ booking_id, user_id, caregiver_profile_id, rating }) => {
  const result = await pool.query(
    `
    INSERT INTO reviews (booking_id, user_id, caregiver_profile_id, rating)
    VALUES ($1, $2, $3, $4)
    RETURNING *
    `,
    [booking_id, user_id, caregiver_profile_id, rating]
  );
  return result.rows[0];
};

const findByBookingId = async (bookingId) => {
  const result = await pool.query(
    `SELECT * FROM reviews WHERE booking_id = $1`,
    [bookingId]
  );
  return result.rows[0] || null;
};

const listByCaregiverProfileId = async (caregiverProfileId, { limit = 20, offset = 0 } = {}) => {
  const result = await pool.query(
    `
    SELECT r.*, b.booking_number, u.name as reviewer_name
    FROM reviews r
    JOIN bookings b ON b.id = r.booking_id
    JOIN users u ON u.id = r.user_id
    WHERE r.caregiver_profile_id = $1
    ORDER BY r.created_at DESC
    LIMIT $2 OFFSET $3
    `,
    [caregiverProfileId, limit, offset]
  );
  return result.rows;
};

const averageRatingForCaregiver = async (caregiverProfileId) => {
  const result = await pool.query(
    `
    SELECT ROUND(AVG(rating)::numeric, 2) AS avg_rating, COUNT(*)::int AS total
    FROM reviews
    WHERE caregiver_profile_id = $1
    `,
    [caregiverProfileId]
  );
  return {
    avg_rating: Number(result.rows[0]?.avg_rating || 0),
    total: Number(result.rows[0]?.total || 0)
  };
};

module.exports = {
  createReview,
  findByBookingId,
  listByCaregiverProfileId,
  averageRatingForCaregiver
};
