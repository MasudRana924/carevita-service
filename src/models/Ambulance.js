const pool = require('../config/database');

const createAmbulanceBooking = async (bookingData) => {
  const {
    user_id, family_member_id, ambulance_type, pickup_location,
    pickup_lat, pickup_long, destination_location, destination_lat,
    destination_long, patient_condition, emergency_contact,
    scheduled_date, total_amount, payment_method
  } = bookingData;

  const booking_number = `AB${Date.now()}${Math.floor(Math.random() * 1000)}`;

  const query = `
    INSERT INTO ambulance_bookings (
      booking_number, user_id, family_member_id, ambulance_type, pickup_location,
      pickup_lat, pickup_long, destination_location, destination_lat, destination_long,
      patient_condition, emergency_contact, scheduled_date, total_amount, payment_method
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    RETURNING *
  `;
  const values = [
    booking_number, user_id, family_member_id, ambulance_type, pickup_location,
    pickup_lat, pickup_long, destination_location, destination_lat, destination_long,
    patient_condition, emergency_contact, scheduled_date, total_amount, payment_method
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const findAmbulanceBookingById = async (id) => {
  const query = `
    SELECT ab.*, 
      u.name as customer_name, u.phone as customer_phone,
      fm.name as family_member_name
    FROM ambulance_bookings ab
    JOIN users u ON ab.user_id = u.id
    LEFT JOIN family_members fm ON ab.family_member_id = fm.id
    WHERE ab.id = $1
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

const findAmbulanceBookingByNumber = async (booking_number) => {
  const query = `
    SELECT ab.*, 
      u.name as customer_name, u.phone as customer_phone,
      fm.name as family_member_name
    FROM ambulance_bookings ab
    JOIN users u ON ab.user_id = u.id
    LEFT JOIN family_members fm ON ab.family_member_id = fm.id
    WHERE ab.booking_number = $1
  `;
  const result = await pool.query(query, [booking_number]);
  return result.rows[0];
};

const findAmbulanceBookingsByUserId = async (user_id, filters = {}) => {
  let query = `
    SELECT ab.*, fm.name as family_member_name
    FROM ambulance_bookings ab
    LEFT JOIN family_members fm ON ab.family_member_id = fm.id
    WHERE ab.user_id = $1
  `;
  const values = [user_id];
  let paramCount = 1;

  if (filters.status) {
    paramCount++;
    query += ` AND ab.status = $${paramCount}`;
    values.push(filters.status);
  }

  query += ' ORDER BY ab.created_at DESC';

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

const updateAmbulanceBooking = async (id, bookingData) => {
  const {
    ambulance_type, pickup_location, pickup_lat, pickup_long,
    destination_location, destination_lat, destination_long,
    patient_condition, emergency_contact, scheduled_date, total_amount
  } = bookingData;

  const query = `
    UPDATE ambulance_bookings 
    SET ambulance_type = $1, pickup_location = $2, pickup_lat = $3, pickup_long = $4,
        destination_location = $5, destination_lat = $6, destination_long = $7,
        patient_condition = $8, emergency_contact = $9, scheduled_date = $10,
        total_amount = $11, updated_at = CURRENT_TIMESTAMP
    WHERE id = $12
    RETURNING *
  `;
  const values = [
    ambulance_type, pickup_location, pickup_lat, pickup_long,
    destination_location, destination_lat, destination_long,
    patient_condition, emergency_contact, scheduled_date, total_amount, id
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const updateAmbulanceBookingStatus = async (id, status) => {
  const query = `
    UPDATE ambulance_bookings 
    SET status = $1, updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING *
  `;
  const result = await pool.query(query, [status, id]);
  return result.rows[0];
};

const assignAmbulanceDriver = async (id, driver_id, vehicle_number) => {
  const query = `
    UPDATE ambulance_bookings 
    SET driver_id = $1, vehicle_number = $2, status = 'assigned',
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $3
    RETURNING *
  `;
  const result = await pool.query(query, [driver_id, vehicle_number, id]);
  return result.rows[0];
};

const updateAmbulanceBookingPaymentStatus = async (id, payment_status) => {
  const query = `
    UPDATE ambulance_bookings 
    SET payment_status = $1, updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING *
  `;
  const result = await pool.query(query, [payment_status, id]);
  return result.rows[0];
};

const cancelAmbulanceBooking = async (id) => {
  const query = `
    UPDATE ambulance_bookings 
    SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING *
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

const completeAmbulanceBooking = async (id) => {
  const query = `
    UPDATE ambulance_bookings 
    SET status = 'completed', updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING *
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

const getActiveAmbulanceBookings = async () => {
  const query = `
    SELECT ab.*, u.name as customer_name, u.phone as customer_phone,
      fm.name as family_member_name
    FROM ambulance_bookings ab
    JOIN users u ON ab.user_id = u.id
    LEFT JOIN family_members fm ON ab.family_member_id = fm.id
    WHERE ab.status IN ('pending', 'assigned', 'on_way')
    ORDER BY ab.scheduled_date ASC
  `;
  const result = await pool.query(query);
  return result.rows;
};

const findAllAmbulanceBookings = async (filters = {}) => {
  let query = `
    SELECT ab.*, u.name as customer_name, fm.name as family_member_name
    FROM ambulance_bookings ab
    JOIN users u ON ab.user_id = u.id
    LEFT JOIN family_members fm ON ab.family_member_id = fm.id
    WHERE 1=1
  `;
  const values = [];
  let paramCount = 0;

  if (filters.status) {
    paramCount++;
    query += ` AND ab.status = $${paramCount}`;
    values.push(filters.status);
  }

  if (filters.date_from) {
    paramCount++;
    query += ` AND ab.scheduled_date >= $${paramCount}`;
    values.push(filters.date_from);
  }

  if (filters.date_to) {
    paramCount++;
    query += ` AND ab.scheduled_date <= $${paramCount}`;
    values.push(filters.date_to);
  }

  query += ' ORDER BY ab.created_at DESC';

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

module.exports = {
  createAmbulanceBooking,
  findAmbulanceBookingById,
  findAmbulanceBookingByNumber,
  findAmbulanceBookingsByUserId,
  updateAmbulanceBooking,
  updateAmbulanceBookingStatus,
  assignAmbulanceDriver,
  updateAmbulanceBookingPaymentStatus,
  cancelAmbulanceBooking,
  completeAmbulanceBooking,
  getActiveAmbulanceBookings,
  findAllAmbulanceBookings
};
