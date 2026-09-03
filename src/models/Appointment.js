const pool = require('../config/database');

const createAppointment = async (appointmentData) => {
  const {
    user_id, family_member_id, doctor_id, hospital_id,
    scheduled_date, appointment_type, consultation_fee, symptoms, notes
  } = appointmentData;

  const appointment_number = `AP${Date.now()}${Math.floor(Math.random() * 1000)}`;

  const query = `
    INSERT INTO appointments (
      appointment_number, user_id, family_member_id, doctor_id, hospital_id,
      scheduled_date, appointment_type, consultation_fee, symptoms, notes
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *
  `;
  const values = [
    appointment_number, user_id, family_member_id, doctor_id, hospital_id,
    scheduled_date, appointment_type, consultation_fee, symptoms, notes
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const findById = async (id) => {
  const query = `
    SELECT a.*, 
      u.name as customer_name, u.phone as customer_phone,
      fm.name as family_member_name, fm.photo as family_member_photo,
      d.name as doctor_name, d.photo as doctor_photo, d.specialty as doctor_specialty,
      h.name as hospital_name, h.address as hospital_address
    FROM appointments a
    JOIN users u ON a.user_id = u.id
    LEFT JOIN family_members fm ON a.family_member_id = fm.id
    JOIN doctors d ON a.doctor_id = d.id
    LEFT JOIN hospitals h ON a.hospital_id = h.id
    WHERE a.id = $1
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

const findByAppointmentNumber = async (appointment_number) => {
  const query = `
    SELECT a.*, 
      u.name as customer_name, u.phone as customer_phone,
      fm.name as family_member_name,
      d.name as doctor_name, d.specialty as doctor_specialty,
      h.name as hospital_name
    FROM appointments a
    JOIN users u ON a.user_id = u.id
    LEFT JOIN family_members fm ON a.family_member_id = fm.id
    JOIN doctors d ON a.doctor_id = d.id
    LEFT JOIN hospitals h ON a.hospital_id = h.id
    WHERE a.appointment_number = $1
  `;
  const result = await pool.query(query, [appointment_number]);
  return result.rows[0];
};

const findByUserId = async (user_id, filters = {}) => {
  let query = `
    SELECT a.*, 
      fm.name as family_member_name,
      d.name as doctor_name, d.specialty as doctor_specialty,
      h.name as hospital_name
    FROM appointments a
    LEFT JOIN family_members fm ON a.family_member_id = fm.id
    JOIN doctors d ON a.doctor_id = d.id
    LEFT JOIN hospitals h ON a.hospital_id = h.id
    WHERE a.user_id = $1
  `;
  const values = [user_id];
  let paramCount = 1;

  if (filters.status) {
    paramCount++;
    query += ` AND a.status = $${paramCount}`;
    values.push(filters.status);
  }

  if (filters.appointment_type) {
    paramCount++;
    query += ` AND a.appointment_type = $${paramCount}`;
    values.push(filters.appointment_type);
  }

  query += ' ORDER BY a.scheduled_date DESC';

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

const findByDoctorId = async (doctor_id, filters = {}) => {
  let query = `
    SELECT a.*, 
      u.name as customer_name, u.phone as customer_phone,
      fm.name as family_member_name, fm.photo as family_member_photo
    FROM appointments a
    JOIN users u ON a.user_id = u.id
    LEFT JOIN family_members fm ON a.family_member_id = fm.id
    WHERE a.doctor_id = $1
  `;
  const values = [doctor_id];
  let paramCount = 1;

  if (filters.status) {
    paramCount++;
    query += ` AND a.status = $${paramCount}`;
    values.push(filters.status);
  }

  if (filters.date_from) {
    paramCount++;
    query += ` AND a.scheduled_date >= $${paramCount}`;
    values.push(filters.date_from);
  }

  if (filters.date_to) {
    paramCount++;
    query += ` AND a.scheduled_date <= $${paramCount}`;
    values.push(filters.date_to);
  }

  query += ' ORDER BY a.scheduled_date ASC';

  if (filters.limit) {
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    values.push(filters.limit);
  }

  const result = await pool.query(query, values);
  return result.rows;
};

const updateAppointment = async (id, appointmentData) => {
  const {
    scheduled_date, appointment_type, consultation_fee, symptoms, notes, status
  } = appointmentData;

  const query = `
    UPDATE appointments 
    SET scheduled_date = $1, appointment_type = $2, consultation_fee = $3,
        symptoms = $4, notes = $5, status = $6, updated_at = CURRENT_TIMESTAMP
    WHERE id = $7
    RETURNING *
  `;
  const values = [
    scheduled_date, appointment_type, consultation_fee, symptoms, notes, status, id
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const updateStatus = async (id, status) => {
  const query = `
    UPDATE appointments 
    SET status = $1, updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING *
  `;
  const result = await pool.query(query, [status, id]);
  return result.rows[0];
};

const updatePaymentStatus = async (id, payment_status) => {
  const query = `
    UPDATE appointments 
    SET payment_status = $1, updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING *
  `;
  const result = await pool.query(query, [payment_status, id]);
  return result.rows[0];
};

const cancel = async (id) => {
  const query = `
    UPDATE appointments 
    SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING *
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

const complete = async (id, prescription_url) => {
  const query = `
    UPDATE appointments 
    SET status = 'completed', prescription_url = $1, updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING *
  `;
  const result = await pool.query(query, [prescription_url, id]);
  return result.rows[0];
};

const getDoctorAvailability = async (doctor_id, date) => {
  const query = `
    SELECT scheduled_date, status
    FROM appointments
    WHERE doctor_id = $1 
    AND DATE(scheduled_date) = $2
    AND status IN ('scheduled', 'confirmed')
    ORDER BY scheduled_date ASC
  `;
  const result = await pool.query(query, [doctor_id, date]);
  return result.rows;
};

module.exports = {
  createAppointment,
  findById,
  findByAppointmentNumber,
  findByUserId,
  findByDoctorId,
  updateAppointment,
  updateStatus,
  updatePaymentStatus,
  cancel,
  complete,
  getDoctorAvailability
};
