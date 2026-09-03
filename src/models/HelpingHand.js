const pool = require('../config/database');

const createHelpingHand = async (handData) => {
  const {
    user_id, name, photo, nid_number, experience, languages,
    skills, location_lat, location_long, service_areas
  } = handData;

  const query = `
    INSERT INTO helping_hands (
      user_id, name, photo, nid_number, experience, languages,
      skills, location_lat, location_long, service_areas
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *
  `;
  const values = [
    user_id, name, photo, nid_number, experience, languages,
    skills, location_lat, location_long, service_areas
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const findById = async (id) => {
  const query = `
    SELECT hh.*, u.phone, u.email 
    FROM helping_hands hh
    JOIN users u ON hh.user_id = u.id
    WHERE hh.id = $1
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

const findByUserId = async (user_id) => {
  const query = 'SELECT * FROM helping_hands WHERE user_id = $1';
  const result = await pool.query(query, [user_id]);
  return result.rows[0];
};

const findAll = async (filters = {}) => {
  let query = `
    SELECT hh.*, u.phone, u.email 
    FROM helping_hands hh
    JOIN users u ON hh.user_id = u.id
    WHERE 1=1
  `;
  const values = [];
  let paramCount = 0;

  if (filters.is_available !== undefined) {
    paramCount++;
    query += ` AND hh.is_available = $${paramCount}`;
    values.push(filters.is_available);
  }

  if (filters.nid_verified !== undefined) {
    paramCount++;
    query += ` AND hh.nid_verified = $${paramCount}`;
    values.push(filters.nid_verified);
  }

  if (filters.background_verified !== undefined) {
    paramCount++;
    query += ` AND hh.background_verified = $${paramCount}`;
    values.push(filters.background_verified);
  }

  if (filters.min_rating) {
    paramCount++;
    query += ` AND hh.rating >= $${paramCount}`;
    values.push(filters.min_rating);
  }

  if (filters.min_experience) {
    paramCount++;
    query += ` AND hh.experience >= $${paramCount}`;
    values.push(filters.min_experience);
  }

  query += ' ORDER BY hh.rating DESC, hh.completed_jobs DESC';

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

const updateHelpingHand = async (id, handData) => {
  const {
    name, photo, nid_number, experience, languages,
    skills, location_lat, location_long, service_areas, is_available
  } = handData;

  const query = `
    UPDATE helping_hands 
    SET name = $1, photo = $2, nid_number = $3, experience = $4, languages = $5,
        skills = $6, location_lat = $7, location_long = $8, service_areas = $9,
        is_available = $10, updated_at = CURRENT_TIMESTAMP
    WHERE id = $11
    RETURNING *
  `;
  const values = [
    name, photo, nid_number, experience, languages,
    skills, location_lat, location_long, service_areas, is_available, id
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const updateVerification = async (id, verificationData) => {
  const { nid_verified, identity_verified, background_verified, training_status } = verificationData;

  const query = `
    UPDATE helping_hands 
    SET nid_verified = $1, identity_verified = $2, background_verified = $3,
        training_status = $4, updated_at = CURRENT_TIMESTAMP
    WHERE id = $5
    RETURNING *
  `;
  const values = [nid_verified, identity_verified, background_verified, training_status, id];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const updateRating = async (id, rating) => {
  const query = `
    UPDATE helping_hands 
    SET rating = $1, updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING *
  `;
  const result = await pool.query(query, [rating, id]);
  return result.rows[0];
};

const incrementCompletedJobs = async (id) => {
  const query = `
    UPDATE helping_hands 
    SET completed_jobs = completed_jobs + 1, updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING *
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

const updateStats = async (id, stats) => {
  const { response_rate, cancellation_rate } = stats;

  const query = `
    UPDATE helping_hands 
    SET response_rate = $1, cancellation_rate = $2, updated_at = CURRENT_TIMESTAMP
    WHERE id = $3
    RETURNING *
  `;
  const result = await pool.query(query, [response_rate, cancellation_rate, id]);
  return result.rows[0];
};

const findAvailable = async (filters = {}) => {
  let query = `
    SELECT hh.*, u.phone, u.email 
    FROM helping_hands hh
    JOIN users u ON hh.user_id = u.id
    WHERE hh.is_available = true
    AND hh.nid_verified = true
    AND hh.background_verified = true
  `;
  const values = [];
  let paramCount = 0;

  if (filters.location_lat && filters.location_long && filters.radius) {
    paramCount++;
    query += ` AND (
      6371 * acos(cos(radians($${paramCount})) * cos(radians(hh.location_lat)) * 
      cos(radians(hh.location_long) - radians($${paramCount + 1})) + 
      sin(radians($${paramCount})) * sin(radians(hh.location_lat)))
    ) <= $${paramCount + 2}`;
    values.push(filters.location_lat, filters.location_long, filters.radius);
    paramCount += 2;
  }

  if (filters.hospital_id) {
    paramCount++;
    query += ` AND hh.service_areas ILIKE $${paramCount}`;
    values.push(`%${filters.hospital_id}%`);
  }

  query += ' ORDER BY hh.rating DESC, hh.completed_jobs DESC';

  if (filters.limit) {
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    values.push(filters.limit);
  }

  const result = await pool.query(query, values);
  return result.rows;
};

module.exports = {
  createHelpingHand,
  findById,
  findByUserId,
  findAll,
  updateHelpingHand,
  updateVerification,
  updateRating,
  incrementCompletedJobs,
  updateStats,
  findAvailable
};
