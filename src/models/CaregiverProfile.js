const pool = require('../config/database');

const createCaregiverProfile = async (profileData) => {
  const {
    user_id, bio, experience_years, service_areas, hourly_rate,
    education, blood_group, date_of_birth, profile_photo, gender,
    district, thana
  } = profileData;

  const query = `
    INSERT INTO caregiver_profiles (
      user_id, bio, experience_years, service_areas, hourly_rate,
      education, blood_group, date_of_birth, profile_photo, gender,
      district, thana, ekyc_status
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, false)
    RETURNING *
  `;
  const values = [
    user_id, bio, experience_years, service_areas, hourly_rate,
    education, blood_group, date_of_birth, profile_photo, gender,
    district, thana
  ];

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
  const {
    bio, experience_years, service_areas, hourly_rate, is_available,
    education, blood_group, date_of_birth, profile_photo, gender,
    district, thana, ekyc_status, ekyc_verified_at, ekyc_reference_id
  } = updateData;

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
        district = COALESCE($11, district),
        thana = COALESCE($12, thana),
        ekyc_status = COALESCE($13, ekyc_status),
        ekyc_verified_at = COALESCE($14, ekyc_verified_at),
        ekyc_reference_id = COALESCE($15, ekyc_reference_id),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $16
    RETURNING *
  `;
  const values = [
    bio, experience_years, service_areas, hourly_rate, is_available,
    education, blood_group, date_of_birth, profile_photo, gender,
    district, thana, ekyc_status, ekyc_verified_at, ekyc_reference_id, id
  ];

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

const buildCaregiverSearch = (filters = {}) => {
  const {
    service_area, name, gender, verification_status, min_rating,
    district, thana
  } = filters;

  let whereSql = `
    FROM caregiver_profiles cp
    JOIN users u ON cp.user_id = u.id
    WHERE 1=1
  `;
  const values = [];
  let paramCount = 0;

  if (name) {
    paramCount++;
    whereSql += ` AND u.name ILIKE $${paramCount}`;
    values.push(`%${name}%`);
  }

  if (district) {
    paramCount++;
    whereSql += ` AND cp.district ILIKE $${paramCount}`;
    values.push(district);
  }

  if (thana) {
    paramCount++;
    whereSql += ` AND cp.thana ILIKE $${paramCount}`;
    values.push(thana);
  }

  if (service_area) {
    paramCount++;
    whereSql += ` AND $${paramCount} = ANY(service_areas)`;
    values.push(service_area);
  }

  if (gender) {
    paramCount++;
    whereSql += ` AND gender = $${paramCount}`;
    values.push(gender);
  }

  if (verification_status) {
    paramCount++;
    whereSql += ` AND verification_status = $${paramCount}`;
    values.push(verification_status);
  }

  if (min_rating) {
    paramCount++;
    whereSql += ` AND rating >= $${paramCount}`;
    values.push(min_rating);
  }

  return { whereSql, values, paramCount };
};

const searchCaregivers = async (filters = {}) => {
  const { page = 1, limit = 20 } = filters;
  const offset = (page - 1) * limit;
  const { whereSql, values, paramCount } = buildCaregiverSearch(filters);

  const listQuery = `
    SELECT cp.*, u.name, u.email, u.phone, u.profile_photo
    ${whereSql}
    ORDER BY rating DESC NULLS LAST,
             completed_bookings DESC NULLS LAST,
             cp.created_at ASC
    LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
  `;
  const countQuery = `SELECT COUNT(*)::int AS count ${whereSql}`;

  const [result, countResult] = await Promise.all([
    pool.query(listQuery, [...values, limit, offset]),
    pool.query(countQuery, values)
  ]);

  return {
    items: result.rows,
    total: countResult.rows[0].count
  };
};

const updateRating = async (id, newRating) => {
  const query = `
    UPDATE caregiver_profiles 
    SET rating = $1,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING *
  `;
  const values = [newRating, id];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const incrementCompletedBookings = async (id) => {
  const result = await pool.query(
    `
    UPDATE caregiver_profiles
    SET completed_bookings = COALESCE(completed_bookings, 0) + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING *
    `,
    [id]
  );
  return result.rows[0];
};

const updateCaregiverEkyc = async (id, ekycData) => {
  const {
    ekyc_status,
    ekyc_verified_at,
    ekyc_reference_id,
    ekyc_session_status,
    verification_status
  } = ekycData;

  const result = await pool.query(
    `
    UPDATE caregiver_profiles
    SET ekyc_status = COALESCE($1, ekyc_status),
        ekyc_verified_at = CASE
          WHEN $1::boolean = true THEN COALESCE($2, ekyc_verified_at, CURRENT_TIMESTAMP)
          WHEN $1::boolean = false THEN $2
          ELSE COALESCE($2, ekyc_verified_at)
        END,
        ekyc_reference_id = COALESCE($3, ekyc_reference_id),
        ekyc_session_status = COALESCE($4, ekyc_session_status),
        verification_status = COALESCE($5, verification_status),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $6
    RETURNING *
    `,
    [ekyc_status, ekyc_verified_at, ekyc_reference_id, ekyc_session_status, verification_status, id]
  );
  return result.rows[0];
};

module.exports = {
  createCaregiverProfile,
  getCaregiverProfileByUserId,
  getCaregiverProfileById,
  updateCaregiverProfile,
  updateCaregiverEkyc,
  updateVerificationStatus,
  searchCaregivers,
  updateRating,
  incrementCompletedBookings
};
