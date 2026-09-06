const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const createBooking = async (bookingData) => {
  const {
    user_id, family_member_id, service_type, provider_type, provider_id,
    hospital_id, booking_date, start_time, end_time, duration_hours,
    pickup_address_id, destination_address_id, patient_requirements, notes, service_charge,
    platform_fee, discount, total_amount, advance_percentage,
    advance_amount, remaining_amount
  } = bookingData;

  const booking_number = `BK${Date.now()}${Math.floor(Math.random() * 1000)}`;

  const query = `
    INSERT INTO bookings (
      booking_number, user_id, family_member_id, service_type, provider_type, provider_id,
      hospital_id, booking_date, start_time, end_time, duration_hours,
      pickup_address_id, destination_address_id, patient_requirements, notes, service_charge,
      platform_fee, discount, total_amount, advance_percentage,
      advance_amount, remaining_amount, status
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, 'PENDING_PAYMENT')
    RETURNING *
  `;
  const values = [
    booking_number, user_id, family_member_id, service_type, provider_type, provider_id,
    hospital_id, booking_date, start_time, end_time, duration_hours,
    pickup_address_id, destination_address_id, patient_requirements, notes, service_charge,
    platform_fee, discount, total_amount, advance_percentage,
    advance_amount, remaining_amount
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const findById = async (id) => {
  const query = `
    SELECT b.*, 
      u.name as customer_name, u.phone as customer_phone,
      fm.name as family_member_name, fm.photo as family_member_photo, fm.relationship as family_member_relationship, fm.blood_group as family_member_blood_group, fm.date_of_birth as family_member_dob,
      h.name as hospital_name, h.address as hospital_address, h.phone as hospital_phone, h.photo as hospital_photo,
      cp.bio as caregiver_bio, cp.education as caregiver_education, cp.experience_years as caregiver_experience, cp.rating as caregiver_rating, cp.profile_photo as caregiver_photo, cp.gender as caregiver_gender, cu.name as caregiver_name, cu.phone as caregiver_phone, cu.email as caregiver_email
    FROM bookings b
    JOIN users u ON b.user_id = u.id
    LEFT JOIN family_members fm ON b.family_member_id = fm.id
    LEFT JOIN hospitals h ON b.hospital_id = h.id
    LEFT JOIN caregiver_profiles cp ON b.provider_id = cp.id AND b.provider_type = 'CAREGIVER'
    LEFT JOIN users cu ON cp.user_id = cu.id
    WHERE b.id = $1
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

const findByBookingNumber = async (booking_number) => {
  const query = `
    SELECT b.*, 
      u.name as customer_name, u.phone as customer_phone,
      fm.name as family_member_name, fm.photo as family_member_photo, fm.relationship as family_member_relationship, fm.blood_group as family_member_blood_group, fm.date_of_birth as family_member_dob,
      h.name as hospital_name, h.address as hospital_address, h.phone as hospital_phone, h.photo as hospital_photo,
      cp.bio as caregiver_bio, cp.education as caregiver_education, cp.experience_years as caregiver_experience, cp.rating as caregiver_rating, cp.profile_photo as caregiver_photo, cp.gender as caregiver_gender, cu.name as caregiver_name, cu.phone as caregiver_phone, cu.email as caregiver_email
    FROM bookings b
    JOIN users u ON b.user_id = u.id
    LEFT JOIN family_members fm ON b.family_member_id = fm.id
    LEFT JOIN hospitals h ON b.hospital_id = h.id
    LEFT JOIN caregiver_profiles cp ON b.provider_id = cp.id AND b.provider_type = 'CAREGIVER'
    LEFT JOIN users cu ON cp.user_id = cu.id
    WHERE b.booking_number = $1
  `;
  const result = await pool.query(query, [booking_number]);
  return result.rows[0];
};

const findByUserId = async (user_id, filters = {}) => {
  let query = `
    SELECT b.*, 
      fm.name as family_member_name, fm.photo as family_member_photo, fm.relationship as family_member_relationship, fm.blood_group as family_member_blood_group, fm.date_of_birth as family_member_dob,
      h.name as hospital_name, h.address as hospital_address, h.phone as hospital_phone, h.photo as hospital_photo,
      cp.bio as caregiver_bio, cp.education as caregiver_education, cp.experience_years as caregiver_experience, cp.rating as caregiver_rating, cp.profile_photo as caregiver_photo, cp.gender as caregiver_gender, cu.name as caregiver_name, cu.phone as caregiver_phone
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
    paramCount++;
    query += ` AND b.status = $${paramCount}`;
    values.push(filters.status);
  }

  if (filters.provider_type) {
    paramCount++;
    query += ` AND b.provider_type = $${paramCount}`;
    values.push(filters.provider_type);
  }

  query += ' ORDER BY b.created_at DESC';

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

const findByProviderId = async (provider_id, provider_type, filters = {}) => {
  let query = `
    SELECT b.*, 
      u.name as customer_name, u.phone as customer_phone,
      fm.name as family_member_name, fm.photo as family_member_photo, fm.relationship as family_member_relationship, fm.blood_group as family_member_blood_group, fm.date_of_birth as family_member_dob,
      h.name as hospital_name, h.address as hospital_address, h.phone as hospital_phone, h.photo as hospital_photo,
      cp.bio as caregiver_bio, cp.education as caregiver_education, cp.experience_years as caregiver_experience, cp.rating as caregiver_rating, cp.profile_photo as caregiver_photo, cp.gender as caregiver_gender, cu.name as caregiver_name, cu.phone as caregiver_phone, cu.email as caregiver_email
    FROM bookings b
    JOIN users u ON b.user_id = u.id
    LEFT JOIN family_members fm ON b.family_member_id = fm.id
    LEFT JOIN hospitals h ON b.hospital_id = h.id
    LEFT JOIN caregiver_profiles cp ON b.provider_id = cp.id AND b.provider_type = 'CAREGIVER'
    LEFT JOIN users cu ON cp.user_id = cu.id
    WHERE b.provider_id = $1 AND b.provider_type = $2
  `;
  const values = [provider_id, provider_type];
  let paramCount = 2;

  if (filters.status) {
    paramCount++;
    query += ` AND b.status = $${paramCount}`;
    values.push(filters.status);
  }

  query += ' ORDER BY b.booking_date ASC';

  if (filters.limit) {
    paramCount++;
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
    paramCount++;
    query += ` AND b.status = $${paramCount}`;
    values.push(filters.status);
  }

  if (filters.provider_type) {
    paramCount++;
    query += ` AND b.provider_type = $${paramCount}`;
    values.push(filters.provider_type);
  }

  if (filters.date_from) {
    paramCount++;
    query += ` AND b.booking_date >= $${paramCount}`;
    values.push(filters.date_from);
  }

  if (filters.date_to) {
    paramCount++;
    query += ` AND b.booking_date <= $${paramCount}`;
    values.push(filters.date_to);
  }

  query += ' ORDER BY b.created_at DESC';

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

const updateBooking = async (id, bookingData) => {
  const {
    provider_id, booking_date, start_time, end_time, duration_hours,
    pickup_address_id, destination_address_id, notes, service_charge,
    platform_fee, discount, total_amount, advance_percentage,
    advance_amount, remaining_amount
  } = bookingData;

  const query = `
    UPDATE bookings 
    SET provider_id = COALESCE($1, provider_id),
        booking_date = COALESCE($2, booking_date),
        start_time = COALESCE($3, start_time),
        end_time = COALESCE($4, end_time),
        duration_hours = COALESCE($5, duration_hours),
        pickup_address_id = COALESCE($6, pickup_address_id),
        destination_address_id = COALESCE($7, destination_address_id),
        notes = COALESCE($8, notes),
        service_charge = COALESCE($9, service_charge),
        platform_fee = COALESCE($10, platform_fee),
        discount = COALESCE($11, discount),
        total_amount = COALESCE($12, total_amount),
        advance_percentage = COALESCE($13, advance_percentage),
        advance_amount = COALESCE($14, advance_amount),
        remaining_amount = COALESCE($15, remaining_amount),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $16
    RETURNING *
  `;
  const values = [
    provider_id, booking_date, start_time, end_time, duration_hours,
    pickup_address_id, destination_address_id, notes, service_charge,
    platform_fee, discount, total_amount, advance_percentage,
    advance_amount, remaining_amount, id
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const updateStatus = async (id, status) => {
  const query = `
    UPDATE bookings 
    SET status = $1, updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING *
  `;
  const result = await pool.query(query, [status, id]);
  return result.rows[0];
};

const updatePaymentStatus = async (id, payment_status) => {
  const query = `
    UPDATE bookings 
    SET payment_status = $1, updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING *
  `;
  const result = await pool.query(query, [payment_status, id]);
  return result.rows[0];
};

const cancel = async (id, cancellation_reason, cancelled_by) => {
  const query = `
    UPDATE bookings 
    SET status = 'cancelled', cancellation_reason = $1, cancelled_by = $2,
        cancelled_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE id = $3
    RETURNING *
  `;
  const result = await pool.query(query, [cancellation_reason, cancelled_by, id]);
  return result.rows[0];
};

const complete = async (id) => {
  const query = `
    UPDATE bookings 
    SET status = 'completed', completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING *
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

const addStatusHistory = async (booking_id, from_status, to_status, changed_by, notes, location_lat, location_long) => {
  const query = `
    INSERT INTO booking_status_history (booking_id, from_status, to_status, changed_by, notes, location_lat, location_long)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `;
  const values = [booking_id, from_status, to_status, changed_by, notes, location_lat, location_long];
  const result = await pool.query(query, values);
  return result.rows[0];
};

const getStatusHistory = async (booking_id) => {
  const query = `
    SELECT * FROM booking_status_history 
    WHERE booking_id = $1 
    ORDER BY created_at ASC
  `;
  const result = await pool.query(query, [booking_id]);
  return result.rows;
};

const getActiveBookings = async () => {
  const query = `
    SELECT b.*, 
      u.name as customer_name, u.phone as customer_phone,
      fm.name as family_member_name,
      h.name as hospital_name
    FROM bookings b
    JOIN users u ON b.user_id = u.id
    LEFT JOIN family_members fm ON b.family_member_id = fm.id
    LEFT JOIN hospitals h ON b.hospital_id = h.id
    WHERE b.status IN ('confirmed', 'in_progress', 'provider_assigned', 'helper_on_way')
    ORDER BY b.scheduled_date ASC
  `;
  const result = await pool.query(query);
  return result.rows;
};

const getTodayBookings = async () => {
  const query = `
    SELECT b.*, 
      u.name as customer_name, u.phone as customer_phone,
      fm.name as family_member_name,
      h.name as hospital_name
    FROM bookings b
    JOIN users u ON b.user_id = u.id
    LEFT JOIN family_members fm ON b.family_member_id = fm.id
    LEFT JOIN hospitals h ON b.hospital_id = h.id
    WHERE DATE(b.scheduled_date) = CURRENT_DATE
    ORDER BY b.scheduled_date ASC
  `;
  const result = await pool.query(query);
  return result.rows;
};

module.exports = {
  createBooking,
  findById,
  findByBookingNumber,
  findByUserId,
  findByProviderId,
  findAll,
  updateBooking,
  updateStatus,
  updatePaymentStatus,
  cancel,
  complete,
  addStatusHistory,
  getStatusHistory,
  getActiveBookings,
  getTodayBookings
};
