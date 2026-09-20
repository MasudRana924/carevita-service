const pool = require('../../config/database');

const BOOKING_DETAIL_SELECT = `
  SELECT b.*,
    u.name as customer_name, u.phone as customer_phone,
    fm.name as family_member_name, fm.photo as family_member_photo,
    fm.relationship as family_member_relationship,
    fm.blood_group as family_member_blood_group, fm.date_of_birth as family_member_dob,
    fm.district as family_member_district, fm.thana as family_member_thana, fm.house as family_member_house,
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
    offer_expires_at = null
  } = bookingData;

  const booking_number = `BK${Date.now()}${Math.floor(Math.random() * 1000)}`;

  const query = `
    INSERT INTO bookings (
      booking_number, user_id, family_member_id, service_type, provider_type, provider_id,
      hospital_id, booking_date, start_time, end_time, duration_hours,
      patient_requirements, notes, service_charge,
      platform_fee, discount, total_amount, advance_percentage,
      advance_amount, remaining_amount, status, offer_expires_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
    RETURNING *
  `;
  const values = [
    booking_number, user_id, family_member_id, service_type, provider_type, provider_id,
    hospital_id, booking_date, start_time, end_time, duration_hours,
    patient_requirements, notes, service_charge,
    platform_fee, discount, total_amount, advance_percentage,
    advance_amount, remaining_amount, status, offer_expires_at
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const findById = async (id) => {
  const result = await pool.query(`${BOOKING_DETAIL_SELECT} WHERE b.id = $1`, [id]);
  return result.rows[0];
};

const findByBookingNumber = async (booking_number) => {
  const result = await pool.query(`${BOOKING_DETAIL_SELECT} WHERE b.booking_number = $1`, [booking_number]);
  return result.rows[0];
};

const findByUserId = async (user_id, filters = {}) => {
  let query = `
    SELECT b.*,
      fm.name as family_member_name, fm.photo as family_member_photo,
      fm.relationship as family_member_relationship,
      fm.blood_group as family_member_blood_group, fm.date_of_birth as family_member_dob,
      fm.district as family_member_district, fm.thana as family_member_thana, fm.house as family_member_house,
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
  return result.rows;
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
  return result.rows;
};

const findAll = async (filters = {}) => {
  let query = `
    SELECT b.*,
      u.name as customer_name, u.phone as customer_phone,
      fm.name as family_member_name,
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
  return result.rows;
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
      fm.name as family_member_name,
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
  return result.rows;
};

const getTodayBookings = async () => {
  const result = await pool.query(`
    SELECT b.*,
      u.name as customer_name, u.phone as customer_phone,
      fm.name as family_member_name,
      h.name as hospital_name
    FROM bookings b
    JOIN users u ON b.user_id = u.id
    LEFT JOIN family_members fm ON b.family_member_id = fm.id
    LEFT JOIN hospitals h ON b.hospital_id = h.id
    WHERE b.booking_date = CURRENT_DATE
    ORDER BY b.start_time ASC
  `);
  return result.rows;
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
