const pool = require('../config/database');

const createReview = async (reviewData) => {
  const {
    booking_id, user_id, provider_id, provider_type, overall_rating,
    punctuality_rating, politeness_rating, professionalism_rating,
    helpfulness_rating, trustworthiness_rating, review
  } = reviewData;

  const query = `
    INSERT INTO reviews (
      booking_id, user_id, provider_id, provider_type, overall_rating,
      punctuality_rating, politeness_rating, professionalism_rating,
      helpfulness_rating, trustworthiness_rating, review
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *
  `;
  const values = [
    booking_id, user_id, provider_id, provider_type, overall_rating,
    punctuality_rating, politeness_rating, professionalism_rating,
    helpfulness_rating, trustworthiness_rating, review
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const findById = async (id) => {
  const query = `
    SELECT r.*, u.name as reviewer_name, fm.name as family_member_name
    FROM reviews r
    JOIN users u ON r.user_id = u.id
    LEFT JOIN bookings b ON r.booking_id = b.id
    LEFT JOIN family_members fm ON b.family_member_id = fm.id
    WHERE r.id = $1
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

const findByProviderId = async (provider_id, provider_type, filters = {}) => {
  let query = `
    SELECT r.*, u.name as reviewer_name, fm.name as family_member_name
    FROM reviews r
    JOIN users u ON r.user_id = u.id
    LEFT JOIN bookings b ON r.booking_id = b.id
    LEFT JOIN family_members fm ON b.family_member_id = fm.id
    WHERE r.provider_id = $1 AND r.provider_type = $2 AND r.is_visible = true
  `;
  const values = [provider_id, provider_type];
  let paramCount = 2;

  query += ' ORDER BY r.created_at DESC';

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

const findByBookingId = async (booking_id) => {
  const query = 'SELECT * FROM reviews WHERE booking_id = $1';
  const result = await pool.query(query, [booking_id]);
  return result.rows[0];
};

const findByUserId = async (user_id, filters = {}) => {
  let query = `
    SELECT r.*, 
      CASE 
        WHEN r.provider_type = 'CAREGIVER' THEN (
          SELECT u.name FROM caregiver_profiles cp JOIN users u ON cp.user_id = u.id WHERE cp.id = r.provider_id
        )
        WHEN r.provider_type = 'NURSE' THEN (
          SELECT u.name FROM nurse_profiles np JOIN users u ON np.user_id = u.id WHERE np.id = r.provider_id
        )
        ELSE 'Unknown'
      END as provider_name
    FROM reviews r
    WHERE r.user_id = $1
  `;
  const values = [user_id];
  let paramCount = 1;

  query += ' ORDER BY r.created_at DESC';

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

const updateReview = async (id, reviewData) => {
  const {
    overall_rating, punctuality_rating, politeness_rating, professionalism_rating,
    helpfulness_rating, trustworthiness_rating, review, is_visible
  } = reviewData;

  const query = `
    UPDATE reviews 
    SET overall_rating = $1, punctuality_rating = $2, politeness_rating = $3,
        professionalism_rating = $4, helpfulness_rating = $5, trustworthiness_rating = $6,
        review = $7, is_visible = $8, updated_at = CURRENT_TIMESTAMP
    WHERE id = $9
    RETURNING *
  `;
  const values = [
    overall_rating, punctuality_rating, politeness_rating, professionalism_rating,
    helpfulness_rating, trustworthiness_rating, review, is_visible, id
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const deleteReview = async (id) => {
  const query = 'DELETE FROM reviews WHERE id = $1 RETURNING *';
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

const getProviderAverageRating = async (provider_id, provider_type) => {
  const query = `
    SELECT 
      AVG(overall_rating) as avg_overall,
      AVG(punctuality_rating) as avg_punctuality,
      AVG(politeness_rating) as avg_politeness,
      AVG(professionalism_rating) as avg_professionalism,
      AVG(helpfulness_rating) as avg_helpfulness,
      AVG(trustworthiness_rating) as avg_trustworthiness,
      COUNT(*) as total_reviews
    FROM reviews
    WHERE provider_id = $1 AND provider_type = $2 AND is_visible = true
  `;
  const result = await pool.query(query, [provider_id, provider_type]);
  return result.rows[0];
};

module.exports = {
  createReview,
  findById,
  findByProviderId,
  findByBookingId,
  findByUserId,
  updateReview,
  deleteReview,
  getProviderAverageRating
};
