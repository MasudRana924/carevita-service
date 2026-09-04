const pool = require('../config/database');

const createNurseProfile = async (profileData) => {
  const { user_id, qualification, specialization, license_number, experience_years, service_areas, hourly_rate } = profileData;
  
  const query = `
    INSERT INTO nurse_profiles (user_id, qualification, specialization, license_number, experience_years, service_areas, hourly_rate)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `;
  const values = [user_id, qualification, specialization, license_number, experience_years, service_areas, hourly_rate];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const getNurseProfileByUserId = async (userId) => {
  const query = 'SELECT * FROM nurse_profiles WHERE user_id = $1';
  const result = await pool.query(query, [userId]);
  return result.rows[0];
};

const getNurseProfileById = async (id) => {
  const query = 'SELECT * FROM nurse_profiles WHERE id = $1';
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

const updateNurseProfile = async (id, updateData) => {
  const { qualification, specialization, license_number, experience_years, service_areas, hourly_rate, is_available } = updateData;
  
  const query = `
    UPDATE nurse_profiles 
    SET qualification = COALESCE($1, qualification),
        specialization = COALESCE($2, specialization),
        license_number = COALESCE($3, license_number),
        experience_years = COALESCE($4, experience_years),
        service_areas = COALESCE($5, service_areas),
        hourly_rate = COALESCE($6, hourly_rate),
        is_available = COALESCE($7, is_available),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $8
    RETURNING *
  `;
  const values = [qualification, specialization, license_number, experience_years, service_areas, hourly_rate, is_available, id];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const updateVerificationStatus = async (id, status, note) => {
  const query = `
    UPDATE nurse_profiles 
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

const searchNurses = async (filters = {}) => {
  const { service_area, specialization, verification_status, min_rating, page = 1, limit = 20 } = filters;
  const offset = (page - 1) * limit;
  
  let query = `
    SELECT np.*, u.name, u.email, u.phone, u.profile_photo
    FROM nurse_profiles np
    JOIN users u ON np.user_id = u.id
    WHERE 1=1
  `;
  const values = [];
  let paramCount = 0;

  if (service_area) {
    paramCount++;
    query += ` AND $${paramCount} = ANY(service_areas)`;
    values.push(service_area);
  }

  if (specialization) {
    paramCount++;
    query += ` AND specialization ILIKE $${paramCount}`;
    values.push(`%${specialization}%`);
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
    UPDATE nurse_profiles 
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
  createNurseProfile,
  getNurseProfileByUserId,
  getNurseProfileById,
  updateNurseProfile,
  updateVerificationStatus,
  searchNurses,
  updateRating
};
