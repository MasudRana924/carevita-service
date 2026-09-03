const pool = require('../config/database');

const createDoctor = async (doctorData) => {
  const {
    user_id, name, photo, bmdc_number, specialty, qualifications,
    experience, hospital_id, consultation_fee, bio
  } = doctorData;

  const query = `
    INSERT INTO doctors (
      user_id, name, photo, bmdc_number, specialty, qualifications,
      experience, hospital_id, consultation_fee, bio
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *
  `;
  const values = [
    user_id, name, photo, bmdc_number, specialty, qualifications,
    experience, hospital_id, consultation_fee, bio
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const findById = async (id) => {
  const query = `
    SELECT d.*, u.phone, u.email, h.name as hospital_name, h.address as hospital_address
    FROM doctors d
    JOIN users u ON d.user_id = u.id
    LEFT JOIN hospitals h ON d.hospital_id = h.id
    WHERE d.id = $1
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

const findByUserId = async (user_id) => {
  const query = 'SELECT * FROM doctors WHERE user_id = $1';
  const result = await pool.query(query, [user_id]);
  return result.rows[0];
};

const findAll = async (filters = {}) => {
  let query = `
    SELECT d.*, u.phone, u.email, h.name as hospital_name
    FROM doctors d
    JOIN users u ON d.user_id = u.id
    LEFT JOIN hospitals h ON d.hospital_id = h.id
    WHERE 1=1
  `;
  const values = [];
  let paramCount = 0;

  if (filters.is_available !== undefined) {
    paramCount++;
    query += ` AND d.is_available = $${paramCount}`;
    values.push(filters.is_available);
  }

  if (filters.is_verified !== undefined) {
    paramCount++;
    query += ` AND d.is_verified = $${paramCount}`;
    values.push(filters.is_verified);
  }

  if (filters.specialty) {
    paramCount++;
    query += ` AND d.specialty ILIKE $${paramCount}`;
    values.push(`%${filters.specialty}%`);
  }

  if (filters.hospital_id) {
    paramCount++;
    query += ` AND d.hospital_id = $${paramCount}`;
    values.push(filters.hospital_id);
  }

  if (filters.min_rating) {
    paramCount++;
    query += ` AND d.rating >= $${paramCount}`;
    values.push(filters.min_rating);
  }

  query += ' ORDER BY d.rating DESC, d.completed_appointments DESC';

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

const updateDoctor = async (id, doctorData) => {
  const {
    name, photo, bmdc_number, specialty, qualifications,
    experience, hospital_id, consultation_fee, bio, is_available
  } = doctorData;

  const query = `
    UPDATE doctors 
    SET name = $1, photo = $2, bmdc_number = $3, specialty = $4, qualifications = $5,
        experience = $6, hospital_id = $7, consultation_fee = $8, bio = $9,
        is_available = $10, updated_at = CURRENT_TIMESTAMP
    WHERE id = $11
    RETURNING *
  `;
  const values = [
    name, photo, bmdc_number, specialty, qualifications,
    experience, hospital_id, consultation_fee, bio, is_available, id
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const updateVerification = async (id, is_verified) => {
  const query = `
    UPDATE doctors 
    SET is_verified = $1, updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING *
  `;
  const result = await pool.query(query, [is_verified, id]);
  return result.rows[0];
};

const updateRating = async (id, rating) => {
  const query = `
    UPDATE doctors 
    SET rating = $1, updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING *
  `;
  const result = await pool.query(query, [rating, id]);
  return result.rows[0];
};

const incrementCompletedAppointments = async (id) => {
  const query = `
    UPDATE doctors 
    SET completed_appointments = completed_appointments + 1, updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING *
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

const search = async (query, filters = {}) => {
  let sql = `
    SELECT d.*, u.phone, u.email, h.name as hospital_name
    FROM doctors d
    JOIN users u ON d.user_id = u.id
    LEFT JOIN hospitals h ON d.hospital_id = h.id
    WHERE (d.name ILIKE $1 OR d.specialty ILIKE $1)
  `;
  const values = [`%${query}%`];
  let paramCount = 1;

  if (filters.is_available !== undefined) {
    paramCount++;
    sql += ` AND d.is_available = $${paramCount}`;
    values.push(filters.is_available);
  }

  if (filters.is_verified !== undefined) {
    paramCount++;
    sql += ` AND d.is_verified = $${paramCount}`;
    values.push(filters.is_verified);
  }

  sql += ' ORDER BY d.rating DESC, d.completed_appointments DESC';

  if (filters.limit) {
    paramCount++;
    sql += ` LIMIT $${paramCount}`;
    values.push(filters.limit);
  }

  const result = await pool.query(sql, values);
  return result.rows;
};

module.exports = {
  createDoctor,
  findById,
  findByUserId,
  findAll,
  updateDoctor,
  updateVerification,
  updateRating,
  incrementCompletedAppointments,
  search
};
