const pool = require('../config/database');

const createCaregiverProfile = async (profileData) => {
  const { user_id, bio, experience_years, service_areas, hourly_rate, education, blood_group, date_of_birth, profile_photo, gender } = profileData;

  const query = `
    INSERT INTO caregiver_profiles (user_id, bio, experience_years, service_areas, hourly_rate, education, blood_group, date_of_birth, profile_photo, gender, ekyc_status)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, false)
    RETURNING *
  `;
  const values = [user_id, bio, experience_years, service_areas, hourly_rate, education, blood_group, date_of_birth, profile_photo, gender];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const getCaregiverProfileByUserId = async (userId) => {
  const query = 'SELECT * FROM caregiver_profiles WHERE user_id = $1';
  const result = await pool.query(query, [userId]);
  return result.rows[0];
};

const getCaregiverProfileById = async (id) => {
  const query = 'SELECT * FROM caregiver_profiles WHERE id = $1';
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

const updateCaregiverProfile = async (id, updateData) => {
  const { bio, experience_years, service_areas, hourly_rate, is_available, education, blood_group, date_of_birth, profile_photo, gender, ekyc_status, ekyc_verified_at, ekyc_reference_id } = updateData;

  const query = `
    UPDATE caregiver_profiles
    SET bio = COALESCE($1, bio),
        experience_years = COALESCE($2, experience_years),
        service_areas = COALESCE($3, service_areas),
        hourly_rate = COALESCE($4, hourly_rate),
        is_available = COALESCE($5, is_available),
        education = COALESCE($6, education),
        blood_group = COALESCE($7, blood_group),
        date_of_birth = COALESCE($8, date_of_birth),
        profile_photo = COALESCE($9, profile_photo),
        gender = COALESCE($10, gender),
        ekyc_status = COALESCE($11, ekyc_status),
        ekyc_verified_at = COALESCE($12, ekyc_verified_at),
        ekyc_reference_id = COALESCE($13, ekyc_reference_id),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $14
    RETURNING *
  `;
  const values = [bio, experience_years, service_areas, hourly_rate, is_available, education, blood_group, date_of_birth, profile_photo, gender, ekyc_status, ekyc_verified_at, ekyc_reference_id, id];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const updateVerificationStatus = async (id, status, note) => {
  const query = `
    UPDATE caregiver_profiles 
    SET verification_status = $1,
        verification_note = $2,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $3
    RETURNING *
  `;
  const values = [status, note, id];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const searchCaregivers = async (filters = {}) => {
  const { service_area, name, gender, verification_status, min_rating, page = 1, limit = 20 } = filters;
  const offset = (page - 1) * limit;
  
  let query = `
    SELECT cp.*, u.name, u.email, u.phone, u.profile_photo
    FROM caregiver_profiles cp
    JOIN users u ON cp.user_id = u.id
    WHERE 1=1
  `;
  const values = [];
  let paramCount = 0;

  if (name) {
    paramCount++;
    query += ` AND u.name ILIKE $${paramCount}`;
    values.push(`%${name}%`);
  }

  if (service_area) {
    paramCount++;
    query += ` AND $${paramCount} = ANY(service_areas)`;
    values.push(service_area);
  }

  if (gender) {
    paramCount++;
    query += ` AND gender = $${paramCount}`;
    values.push(gender);
  }

  if (verification_status) {
    paramCount++;
    query += ` AND verification_status = $${paramCount}`;
    values.push(verification_status);
  }

  if (min_rating) {
    paramCount++;
    query += ` AND rating >= $${paramCount}`;
    values.push(min_rating);
  }

  query += ` ORDER BY rating DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
  values.push(limit, offset);

  const result = await pool.query(query, values);
  return result.rows;
};

const updateRating = async (id, newRating) => {
  const query = `
    UPDATE caregiver_profiles 
    SET rating = $1,
        completed_bookings = completed_bookings + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING *
  `;
  const values = [newRating, id];

  const result = await pool.query(query, values);
  return result.rows[0];
};

module.exports = {
  createCaregiverProfile,
  getCaregiverProfileByUserId,
  getCaregiverProfileById,
  updateCaregiverProfile,
  updateVerificationStatus,
  searchCaregivers,
  updateRating
};
