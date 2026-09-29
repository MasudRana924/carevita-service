const pool = require('../../config/database');

const frozen = (snapshotKey, liveSql) => `
  CASE
    WHEN b.patient_snapshot IS NOT NULL THEN b.patient_snapshot->>'${snapshotKey}'
    ELSE ${liveSql}
  END
`;

const FAMILY_MEMBER_COLUMNS = `
  ${frozen('name', 'fm.name')} AS family_member_name,
  ${frozen('photo', 'fm.photo')} AS family_member_photo,
  ${frozen('relationship', 'fm.relationship')} AS family_member_relationship,
  ${frozen('blood_group', 'fm.blood_group')} AS family_member_blood_group,
  ${frozen('date_of_birth', 'fm.date_of_birth::text')} AS family_member_dob,
  ${frozen('district', 'fm.district')} AS family_member_district,
  ${frozen('thana', 'fm.thana')} AS family_member_thana,
  ${frozen('house', 'fm.house')} AS family_member_house
`;

const FAMILY_MEMBER_PHI = `
  ${frozen('medical_history', 'fm.medical_history')} AS family_member_medical_history,
  ${frozen('existing_conditions', 'fm.existing_conditions')} AS family_member_existing_conditions,
  ${frozen('allergies', 'fm.allergies')} AS family_member_allergies,
  ${frozen('current_medications', 'fm.current_medications')} AS family_member_current_medications,
  ${frozen('allergies', 'fm.allergies')} AS allergies,
  ${frozen('existing_conditions', 'fm.existing_conditions')} AS existing_conditions,
  ${frozen('current_medications', 'fm.current_medications')} AS current_medications,
  ${frozen('medical_history', 'fm.medical_history')} AS medical_history
`;

const attachPatient = (row) => {
  const source = String(row.book_for || 'FAMILY').toUpperCase() === 'SELF' ? 'SELF' : 'FAMILY';
  row.patient = {
    source,
    family_member_id: row.family_member_id || null,
    name: row.family_member_name || null,
    relationship: row.family_member_relationship || null,
    photo: row.family_member_photo || null,
    blood_group: row.family_member_blood_group || null,
    date_of_birth: row.family_member_dob || null,
    district: row.family_member_district || null,
    thana: row.family_member_thana || null,
    house: row.family_member_house || null
  };
  return row;
};

const publishBooking = (row) => {
  if (!row) return row;
  if (Object.prototype.hasOwnProperty.call(row, 'patient_snapshot')) {
    delete row.patient_snapshot;
  }
  return attachPatient(row);
};

const BOOKING_DETAIL_SELECT = `
  SELECT b.*,
    u.name as customer_name, u.phone as customer_phone,
    ${FAMILY_MEMBER_COLUMNS},
    ${FAMILY_MEMBER_PHI},
    h.name as hospital_name, h.address as hospital_address, h.phone as hospital_phone,
    h.photo as hospital_photo, h.district as hospital_district, h.city as hospital_city,
    cp.bio as caregiver_bio, cp.education as caregiver_education,
    cp.experience_years as caregiver_experience, cp.rating as caregiver_rating,
    cp.profile_photo as caregiver_photo, cp.gender as caregiver_gender,
    cu.name as caregiver_name, cu.phone as caregiver_phone, cu.email as caregiver_email
  FROM bookings b
  JOIN users u ON b.user_id = u.id
  LEFT JOIN family_members fm ON b.family_member_id = fm.id
  LEFT JOIN hospitals h ON b.hospital_id = h.id
  LEFT JOIN caregiver_profiles cp ON b.provider_id = cp.id AND b.provider_type = 'CAREGIVER'
  LEFT JOIN users cu ON cp.user_id = cu.id
`;

const createBooking = async (bookingData) => {
  const {
    user_id, family_member_id, service_type, provider_type, provider_id,
    hospital_id, booking_date, start_time, end_time, duration_hours,
    patient_requirements, notes, service_charge,
    platform_fee, discount, total_amount, advance_percentage,
    advance_amount, remaining_amount, status = 'PROVIDER_ASSIGNED',
    offer_expires_at = null,
    book_for = 'FAMILY',
    patient_snapshot = null
  } = bookingData;

  const booking_number = `BK${Date.now()}${Math.floor(Math.random() * 1000)}`;

  const query = `
    INSERT INTO bookings (
      booking_number, user_id, family_member_id, service_type, provider_type, provider_id,
      hospital_id, booking_date, start_time, end_time, duration_hours,
      patient_requirements, notes, service_charge,
      platform_fee, discount, total_amount, advance_percentage,
      advance_amount, remaining_amount, status, offer_expires_at,
      book_for, patient_snapshot
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24::jsonb)
    RETURNING *
  `;
  const values = [
    booking_number, user_id, family_member_id, service_type, provider_type, provider_id,
    hospital_id, booking_date, start_time, end_time, duration_hours,
    patient_requirements, notes, service_charge,
    platform_fee, discount, total_amount, advance_percentage,
    advance_amount, remaining_amount, status, offer_expires_at,
    book_for,
    patient_snapshot ? JSON.stringify(patient_snapshot) : null
  ];

  const result = await pool.query(query, values);
  return publishBooking(result.rows[0]);
};

const findById = async (id) => {
  const result = await pool.query(`${BOOKING_DETAIL_SELECT} WHERE b.id = $1`, [id]);
  return publishBooking(result.rows[0]);
};

const findByBookingNumber = async (booking_number) => {
  const result = await pool.query(`${BOOKING_DETAIL_SELECT} WHERE b.booking_number = $1`, [booking_number]);
  return publishBooking(result.rows[0]);
};

const findByUserId = async (user_id, filters = {}) => {
  let query = `
    SELECT b.*,
      ${FAMILY_MEMBER_COLUMNS},
      h.name as hospital_name, h.address as hospital_address, h.phone as hospital_phone, h.photo as hospital_photo,
      cp.bio as caregiver_bio, cp.education as caregiver_education,
      cp.experience_years as caregiver_experience, cp.rating as caregiver_rating,
      cp.profile_photo as caregiver_photo, cp.gender as caregiver_gender,
      cu.name as caregiver_name, cu.phone as caregiver_phone
    FROM bookings b
    LEFT JOIN family_members fm ON b.family_member_id = fm.id
    LEFT JOIN hospitals h ON b.hospital_id = h.id
    LEFT JOIN caregiver_profiles cp ON b.provider_id = cp.id AND b.provider_type = 'CAREGIVER'
    LEFT JOIN users cu ON cp.user_id = cu.id
    WHERE b.user_id = $1
  `;
  const values = [user_id];
  let paramCount = 1;

  if (filters.status) {
    paramCount += 1;
    query += ` AND b.status = $${paramCount}`;
    values.push(filters.status);
  }
  if (filters.provider_type) {
    paramCount += 1;
    query += ` AND b.provider_type = $${paramCount}`;
    values.push(filters.provider_type);
  }

  query += ' ORDER BY b.created_at DESC';
  if (filters.limit) {
    paramCount += 1;
    query += ` LIMIT $${paramCount}`;
    values.push(filters.limit);
  }
  if (filters.offset) {
    paramCount += 1;
    query += ` OFFSET $${paramCount}`;
    values.push(filters.offset);
  }

  const result = await pool.query(query, values);
  return result.rows.map(publishBooking);
};

const countByUserId = async (user_id, filters = {}) => {
  let query = 'SELECT COUNT(*)::int AS count FROM bookings b WHERE b.user_id = $1';
  const values = [user_id];
  let paramCount = 1;
  if (filters.status) {
    paramCount += 1;
    query += ` AND b.status = $${paramCount}`;
    values.push(filters.status);
  }
  if (filters.provider_type) {
    paramCount += 1;
    query += ` AND b.provider_type = $${paramCount}`;
    values.push(filters.provider_type);
  }
  const result = await pool.query(query, values);
  return result.rows[0].count;
};

const findByProviderId = async (provider_id, provider_type, filters = {}) => {
  let query = `
    ${BOOKING_DETAIL_SELECT}
    WHERE b.provider_id = $1 AND b.provider_type = $2
  `;
  const values = [provider_id, provider_type];
  let paramCount = 2;
  if (filters.status) {
    paramCount += 1;
    query += ` AND b.status = $${paramCount}`;
    values.push(filters.status);
  }
  query += ' ORDER BY b.booking_date ASC';
  if (filters.limit) {
    paramCount += 1;
    query += ` LIMIT $${paramCount}`;
    values.push(filters.limit);
  }
  const result = await pool.query(query, values);
  return result.rows.map(publishBooking);
};

const findAll = async (filters = {}) => {
  let query = `
    SELECT b.*,
      u.name as customer_name, u.phone as customer_phone,
      ${frozen('name', 'fm.name')} as family_member_name,
      h.name as hospital_name
    FROM bookings b
    JOIN users u ON b.user_id = u.id
    LEFT JOIN family_members fm ON b.family_member_id = fm.id
    LEFT JOIN hospitals h ON b.hospital_id = h.id
    WHERE 1=1
  `;
  const values = [];
  let paramCount = 0;
  if (filters.status) {
    paramCount += 1;
    query += ` AND b.status = $${paramCount}`;
    values.push(filters.status);
  }
  if (filters.provider_type) {
    paramCount += 1;
    query += ` AND b.provider_type = $${paramCount}`;
    values.push(filters.provider_type);
  }
  if (filters.date_from) {
    paramCount += 1;
    query += ` AND b.booking_date >= $${paramCount}`;
    values.push(filters.date_from);
  }
  if (filters.date_to) {
    paramCount += 1;
    query += ` AND b.booking_date <= $${paramCount}`;
    values.push(filters.date_to);
  }
  query += ' ORDER BY b.created_at DESC';
  if (filters.limit) {
    paramCount += 1;
    query += ` LIMIT $${paramCount}`;
    values.push(filters.limit);
  }
  if (filters.offset) {
    paramCount += 1;
    query += ` OFFSET $${paramCount}`;
    values.push(filters.offset);
  }
  const result = await pool.query(query, values);
  return result.rows.map(publishBooking);
};

const countAll = async (filters = {}) => {
  let query = 'SELECT COUNT(*)::int AS count FROM bookings b WHERE 1=1';
  const values = [];
  let paramCount = 0;
  if (filters.status) {
    paramCount += 1;
    query += ` AND b.status = $${paramCount}`;
    values.push(filters.status);
  }
  if (filters.provider_type) {
    paramCount += 1;
    query += ` AND b.provider_type = $${paramCount}`;
    values.push(filters.provider_type);
  }
  if (filters.date_from) {
    paramCount += 1;
    query += ` AND b.booking_date >= $${paramCount}`;
    values.push(filters.date_from);
  }
  if (filters.date_to) {
    paramCount += 1;
    query += ` AND b.booking_date <= $${paramCount}`;
    values.push(filters.date_to);
  }
  const result = await pool.query(query, values);
  return result.rows[0].count;
};

const getActiveBookings = async () => {
  const result = await pool.query(`
    SELECT b.*,
      u.name as customer_name, u.phone as customer_phone,
      ${frozen('name', 'fm.name')} as family_member_name,
      h.name as hospital_name
    FROM bookings b
    JOIN users u ON b.user_id = u.id
    LEFT JOIN family_members fm ON b.family_member_id = fm.id
    LEFT JOIN hospitals h ON b.hospital_id = h.id
    WHERE b.status IN (
      'PROVIDER_ASSIGNED', 'PROVIDER_ACCEPTED', 'PAYMENT_PAID', 'SERVICE_IN_PROGRESS'
    )
    ORDER BY b.booking_date ASC
  `);
  return result.rows.map(publishBooking);
};

const getTodayBookings = async () => {
  const result = await pool.query(`
    SELECT b.*,
      u.name as customer_name, u.phone as customer_phone,
      ${frozen('name', 'fm.name')} as family_member_name,
      h.name as hospital_name
    FROM bookings b
    JOIN users u ON b.user_id = u.id
    LEFT JOIN family_members fm ON b.family_member_id = fm.id
    LEFT JOIN hospitals h ON b.hospital_id = h.id
    WHERE b.booking_date = CURRENT_DATE
    ORDER BY b.start_time ASC
  `);
  return result.rows.map(publishBooking);
};

module.exports = {
  createBooking,
  findById,
  findByBookingNumber,
  findByUserId,
  countByUserId,
  findByProviderId,
  findAll,
  countAll,
  getActiveBookings,
  getTodayBookings
};
