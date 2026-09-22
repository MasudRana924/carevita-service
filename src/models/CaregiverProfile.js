const pool = require('../config/database');

const createCaregiverProfile = async (profileData) => {
  const {
    user_id, bio, experience_years, service_areas, hourly_rate,
    education, blood_group, date_of_birth, profile_photo, gender,
    district, thana, provider_type = 'CAREGIVER',
    credential_number, credential_type, specialization
  } = profileData;

  const type = String(provider_type || 'CAREGIVER').toUpperCase() === 'NURSE'
    ? 'NURSE'
    : 'CAREGIVER';

  const query = `
    INSERT INTO caregiver_profiles (
      user_id, bio, experience_years, service_areas, hourly_rate,
      education, blood_group, date_of_birth, profile_photo, gender,
      district, thana, ekyc_status, provider_type,
      credential_number, credential_type, specialization, credential_status
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, false, $13, $14, $15, $16, $17)
    RETURNING *
  `;
  const values = [
    user_id, bio, experience_years, service_areas, hourly_rate,
    education, blood_group, date_of_birth, profile_photo, gender,
    district, thana, type,
    credential_number || null,
    credential_type || null,
    specialization || null,
    type === 'NURSE' ? 'PENDING' : 'NOT_REQUIRED'
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const PROFILE_WITH_USER_SQL = `
  SELECT cp.*,
         u.name,
         u.email,
         u.phone,
         u.language_preference,
         u.emergency_contact,
         u.address
  FROM caregiver_profiles cp
  JOIN users u ON u.id = cp.user_id
`;

const getCaregiverProfileByUserId = async (userId) => {
  const result = await pool.query(
    `${PROFILE_WITH_USER_SQL} WHERE cp.user_id = $1`,
    [userId]
  );
  return result.rows[0];
};

const getCaregiverProfileById = async (id) => {
  const result = await pool.query(
    `${PROFILE_WITH_USER_SQL} WHERE cp.id = $1`,
    [id]
  );
  return result.rows[0];
};

const updateCaregiverProfile = async (id, updateData) => {
  const allowedFields = [
    'bio',
    'experience_years',
    'service_areas',
    'hourly_rate',
    'is_available',
    'education',
    'blood_group',
    'date_of_birth',
    'profile_photo',
    'gender',
    'district',
    'thana',
    'credential_number',
    'credential_type',
    'specialization'
  ];

  const sets = [];
  const values = [];
  let param = 1;

  for (const field of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(updateData, field) && updateData[field] !== undefined) {
      sets.push(`${field} = $${param++}`);
      values.push(updateData[field]);
    }
  }

  if (sets.length === 0) {
    return getCaregiverProfileById(id);
  }

  sets.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id);

  await pool.query(
    `UPDATE caregiver_profiles SET ${sets.join(', ')} WHERE id = $${param} RETURNING id`,
    values
  );

  return getCaregiverProfileById(id);
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

const updateCredentialStatus = async (id, { credential_status, credential_note, credential_expires_at }) => {
  const result = await pool.query(
    `
    UPDATE caregiver_profiles
    SET credential_status = COALESCE($1, credential_status),
        credential_note = COALESCE($2, credential_note),
        credential_expires_at = COALESCE($3, credential_expires_at),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $4
    RETURNING *
    `,
    [credential_status || null, credential_note || null, credential_expires_at || null, id]
  );
  return result.rows[0];
};

/** Eligible for marketplace offers: not suspended, and nurses need verified non-expired credential. */
const isEligibleForBooking = (profile) => {
  if (!profile) return false;
  if (profile.is_available === false) return false;
  const vs = String(profile.verification_status || 'PENDING').toUpperCase();
  if (vs === 'SUSPENDED' || vs === 'REJECTED') return false;

  const type = String(profile.provider_type || 'CAREGIVER').toUpperCase();
  if (type === 'NURSE') {
    const cs = String(profile.credential_status || '').toUpperCase();
    if (cs !== 'VERIFIED') return false;
    if (profile.credential_expires_at) {
      const exp = new Date(profile.credential_expires_at);
      if (!Number.isNaN(exp.getTime()) && exp.getTime() < Date.now()) return false;
    }
  }
  return true;
};

const buildCaregiverSearch = (filters = {}) => {
  const {
    service_area, name, gender, verification_status, min_rating,
    district, thana, ekyc_session_status
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

  if (ekyc_session_status) {
    paramCount++;
    whereSql += ` AND COALESCE(u.ekyc_session_status, cp.ekyc_session_status) = $${paramCount}`;
    values.push(ekyc_session_status);
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
    SELECT cp.*,
           u.name, u.email, u.phone, u.profile_photo AS user_profile_photo,
           u.ekyc_status AS user_ekyc_status,
           u.ekyc_session_status AS user_ekyc_session_status,
           u.ekyc_verified_at AS user_ekyc_verified_at,
           u.ekyc_reference_id AS user_ekyc_reference_id
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
  updateCredentialStatus,
  isEligibleForBooking,
  searchCaregivers,
  updateRating,
  incrementCompletedBookings
};
