const pool = require('../config/database');

const createNurse = async (nurseData) => {
  const {
    user_id, name, photo, nid_number, credentials, experience,
    specializations, languages, skills, location_lat, location_long, service_areas
  } = nurseData;

  const query = `
    INSERT INTO nurses (
      user_id, name, photo, nid_number, credentials, experience,
      specializations, languages, skills, location_lat, location_long, service_areas
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING *
  `;
  const values = [
    user_id, name, photo, nid_number, credentials, experience,
    specializations, languages, skills, location_lat, location_long, service_areas
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const findById = async (id) => {
  const query = `
    SELECT n.*, u.phone, u.email 
    FROM nurses n
    JOIN users u ON n.user_id = u.id
    WHERE n.id = $1
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

const findByUserId = async (user_id) => {
  const query = 'SELECT * FROM nurses WHERE user_id = $1';
  const result = await pool.query(query, [user_id]);
  return result.rows[0];
};

const findAll = async (filters = {}) => {
  let query = `
    SELECT n.*, u.phone, u.email 
    FROM nurses n
    JOIN users u ON n.user_id = u.id
    WHERE 1=1
  `;
  const values = [];
  let paramCount = 0;

  if (filters.is_available !== undefined) {
    paramCount++;
    query += ` AND n.is_available = $${paramCount}`;
    values.push(filters.is_available);
  }

  if (filters.specialization) {
    paramCount++;
    query += ` AND n.specializations ILIKE $${paramCount}`;
    values.push(`%${filters.specialization}%`);
  }

  if (filters.min_rating) {
    paramCount++;
    query += ` AND n.rating >= $${paramCount}`;
    values.push(filters.min_rating);
  }

  if (filters.min_experience) {
    paramCount++;
    query += ` AND n.experience >= $${paramCount}`;
    values.push(filters.min_experience);
  }

  query += ' ORDER BY n.rating DESC, n.completed_services DESC';

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

const updateNurse = async (id, nurseData) => {
  const {
    name, photo, nid_number, credentials, experience,
    specializations, languages, skills, location_lat, location_long, service_areas, is_available
  } = nurseData;

  const query = `
    UPDATE nurses 
    SET name = $1, photo = $2, nid_number = $3, credentials = $4, experience = $5,
        specializations = $6, languages = $7, skills = $8, location_lat = $9,
        location_long = $10, service_areas = $11, is_available = $12, updated_at = CURRENT_TIMESTAMP
    WHERE id = $13
    RETURNING *
  `;
  const values = [
    name, photo, nid_number, credentials, experience,
    specializations, languages, skills, location_lat, location_long, service_areas, is_available, id
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const updateVerification = async (id, verificationData) => {
  const { nid_verified, identity_verified, background_verified, training_status } = verificationData;

  const query = `
    UPDATE nurses 
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
    UPDATE nurses 
    SET rating = $1, updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING *
  `;
  const result = await pool.query(query, [rating, id]);
  return result.rows[0];
};

const incrementCompletedServices = async (id) => {
  const query = `
    UPDATE nurses 
    SET completed_services = completed_services + 1, updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING *
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

const findAvailable = async (filters = {}) => {
  let query = `
    SELECT n.*, u.phone, u.email 
    FROM nurses n
    JOIN users u ON n.user_id = u.id
    WHERE n.is_available = true
    AND n.nid_verified = true
    AND n.background_verified = true
  `;
  const values = [];
  let paramCount = 0;

  if (filters.location_lat && filters.location_long && filters.radius) {
    paramCount++;
    query += ` AND (
      6371 * acos(cos(radians($${paramCount})) * cos(radians(n.location_lat)) * 
      cos(radians(n.location_long) - radians($${paramCount + 1})) + 
      sin(radians($${paramCount})) * sin(radians(n.location_lat)))
    ) <= $${paramCount + 2}`;
    values.push(filters.location_lat, filters.location_long, filters.radius);
    paramCount += 2;
  }

  if (filters.specialization) {
    paramCount++;
    query += ` AND n.specializations ILIKE $${paramCount}`;
    values.push(`%${filters.specialization}%`);
  }

  query += ' ORDER BY n.rating DESC, n.completed_services DESC';

  if (filters.limit) {
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    values.push(filters.limit);
  }

  const result = await pool.query(query, values);
  return result.rows;
};

module.exports = {
  createNurse,
  findById,
  findByUserId,
  findAll,
  updateNurse,
  updateVerification,
  updateRating,
  incrementCompletedServices,
  findAvailable
};
