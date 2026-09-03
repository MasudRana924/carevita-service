const pool = require('../config/database');

// Diagnostic Test functions
const createDiagnosticTest = async (testData) => {
  const {
    name, category, description, sample_type, preparation_instructions,
    normal_range, price
  } = testData;

  const query = `
    INSERT INTO diagnostic_tests (
      name, category, description, sample_type, preparation_instructions,
      normal_range, price
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `;
  const values = [
    name, category, description, sample_type, preparation_instructions,
    normal_range, price
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const findDiagnosticTestById = async (id) => {
  const query = 'SELECT * FROM diagnostic_tests WHERE id = $1';
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

const findAllDiagnosticTests = async (filters = {}) => {
  let query = 'SELECT * FROM diagnostic_tests WHERE 1=1';
  const values = [];
  let paramCount = 0;

  if (filters.is_active !== undefined) {
    paramCount++;
    query += ` AND is_active = $${paramCount}`;
    values.push(filters.is_active);
  }

  if (filters.category) {
    paramCount++;
    query += ` AND category = $${paramCount}`;
    values.push(filters.category);
  }

  query += ' ORDER BY name ASC';

  if (filters.limit) {
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    values.push(filters.limit);
  }

  const result = await pool.query(query, values);
  return result.rows;
};

const searchDiagnosticTests = async (query, filters = {}) => {
  let sql = `
    SELECT * FROM diagnostic_tests 
    WHERE (name ILIKE $1 OR category ILIKE $1)
  `;
  const values = [`%${query}%`];
  let paramCount = 1;

  if (filters.is_active !== undefined) {
    paramCount++;
    sql += ` AND is_active = $${paramCount}`;
    values.push(filters.is_active);
  }

  sql += ' ORDER BY name ASC';

  if (filters.limit) {
    paramCount++;
    sql += ` LIMIT $${paramCount}`;
    values.push(filters.limit);
  }

  const result = await pool.query(sql, values);
  return result.rows;
};

const updateDiagnosticTest = async (id, testData) => {
  const {
    name, category, description, sample_type, preparation_instructions,
    normal_range, price, is_active
  } = testData;

  const query = `
    UPDATE diagnostic_tests 
    SET name = $1, category = $2, description = $3, sample_type = $4,
        preparation_instructions = $5, normal_range = $6, price = $7,
        is_active = $8, updated_at = CURRENT_TIMESTAMP
    WHERE id = $9
    RETURNING *
  `;
  const values = [
    name, category, description, sample_type, preparation_instructions,
    normal_range, price, is_active, id
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const deleteDiagnosticTest = async (id) => {
  const query = 'DELETE FROM diagnostic_tests WHERE id = $1 RETURNING *';
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

// Diagnostic Center functions
const createDiagnosticCenter = async (centerData) => {
  const {
    name, address, phone, email, location_lat, location_long,
    city, district
  } = centerData;

  const query = `
    INSERT INTO diagnostic_centers (
      name, address, phone, email, location_lat, location_long, city, district
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `;
  const values = [
    name, address, phone, email, location_lat, location_long, city, district
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const findDiagnosticCenterById = async (id) => {
  const query = 'SELECT * FROM diagnostic_centers WHERE id = $1';
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

const findAllDiagnosticCenters = async (filters = {}) => {
  let query = 'SELECT * FROM diagnostic_centers WHERE 1=1';
  const values = [];
  let paramCount = 0;

  if (filters.is_active !== undefined) {
    paramCount++;
    query += ` AND is_active = $${paramCount}`;
    values.push(filters.is_active);
  }

  if (filters.is_verified !== undefined) {
    paramCount++;
    query += ` AND is_verified = $${paramCount}`;
    values.push(filters.is_verified);
  }

  if (filters.city) {
    paramCount++;
    query += ` AND city ILIKE $${paramCount}`;
    values.push(`%${filters.city}%`);
  }

  if (filters.district) {
    paramCount++;
    query += ` AND district ILIKE $${paramCount}`;
    values.push(`%${filters.district}%`);
  }

  query += ' ORDER BY rating DESC, name ASC';

  if (filters.limit) {
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    values.push(filters.limit);
  }

  const result = await pool.query(query, values);
  return result.rows;
};

const updateDiagnosticCenter = async (id, centerData) => {
  const {
    name, address, phone, email, location_lat, location_long,
    city, district, is_active
  } = centerData;

  const query = `
    UPDATE diagnostic_centers 
    SET name = $1, address = $2, phone = $3, email = $4, location_lat = $5,
        location_long = $6, city = $7, district = $8, is_active = $9,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $10
    RETURNING *
  `;
  const values = [
    name, address, phone, email, location_lat, location_long,
    city, district, is_active, id
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const updateDiagnosticCenterVerification = async (id, is_verified) => {
  const query = `
    UPDATE diagnostic_centers 
    SET is_verified = $1, updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING *
  `;
  const result = await pool.query(query, [is_verified, id]);
  return result.rows[0];
};

// Diagnostic Booking functions
const createDiagnosticBooking = async (bookingData) => {
  const {
    user_id, family_member_id, diagnostic_center_id, test_id,
    scheduled_date, is_home_collection, collection_address,
    collection_lat, collection_long, total_amount, payment_method
  } = bookingData;

  const booking_number = `DB${Date.now()}${Math.floor(Math.random() * 1000)}`;

  const query = `
    INSERT INTO diagnostic_bookings (
      booking_number, user_id, family_member_id, diagnostic_center_id, test_id,
      scheduled_date, is_home_collection, collection_address, collection_lat,
      collection_long, total_amount, payment_method
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING *
  `;
  const values = [
    booking_number, user_id, family_member_id, diagnostic_center_id, test_id,
    scheduled_date, is_home_collection, collection_address, collection_lat,
    collection_long, total_amount, payment_method
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const findDiagnosticBookingById = async (id) => {
  const query = `
    SELECT db.*, 
      u.name as customer_name, u.phone as customer_phone,
      fm.name as family_member_name,
      dc.name as center_name, dc.address as center_address,
      dt.name as test_name, dt.category as test_category
    FROM diagnostic_bookings db
    JOIN users u ON db.user_id = u.id
    LEFT JOIN family_members fm ON db.family_member_id = fm.id
    LEFT JOIN diagnostic_centers dc ON db.diagnostic_center_id = dc.id
    LEFT JOIN diagnostic_tests dt ON db.test_id = dt.id
    WHERE db.id = $1
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

const findDiagnosticBookingsByUserId = async (user_id, filters = {}) => {
  let query = `
    SELECT db.*, fm.name as family_member_name,
      dc.name as center_name, dt.name as test_name
    FROM diagnostic_bookings db
    LEFT JOIN family_members fm ON db.family_member_id = fm.id
    LEFT JOIN diagnostic_centers dc ON db.diagnostic_center_id = dc.id
    LEFT JOIN diagnostic_tests dt ON db.test_id = dt.id
    WHERE db.user_id = $1
  `;
  const values = [user_id];
  let paramCount = 1;

  if (filters.status) {
    paramCount++;
    query += ` AND db.status = $${paramCount}`;
    values.push(filters.status);
  }

  query += ' ORDER BY db.created_at DESC';

  if (filters.limit) {
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    values.push(filters.limit);
  }

  const result = await pool.query(query, values);
  return result.rows;
};

const updateDiagnosticBookingStatus = async (id, status) => {
  const query = `
    UPDATE diagnostic_bookings 
    SET status = $1, updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING *
  `;
  const result = await pool.query(query, [status, id]);
  return result.rows[0];
};

const updateDiagnosticBookingReport = async (id, report_url) => {
  const query = `
    UPDATE diagnostic_bookings 
    SET report_url = $1, status = 'completed', updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING *
  `;
  const result = await pool.query(query, [report_url, id]);
  return result.rows[0];
};

const updateDiagnosticBookingPaymentStatus = async (id, payment_status) => {
  const query = `
    UPDATE diagnostic_bookings 
    SET payment_status = $1, updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING *
  `;
  const result = await pool.query(query, [payment_status, id]);
  return result.rows[0];
};

module.exports = {
  // Diagnostic Test
  createDiagnosticTest,
  findDiagnosticTestById,
  findAllDiagnosticTests,
  searchDiagnosticTests,
  updateDiagnosticTest,
  deleteDiagnosticTest,
  // Diagnostic Center
  createDiagnosticCenter,
  findDiagnosticCenterById,
  findAllDiagnosticCenters,
  updateDiagnosticCenter,
  updateDiagnosticCenterVerification,
  // Diagnostic Booking
  createDiagnosticBooking,
  findDiagnosticBookingById,
  findDiagnosticBookingsByUserId,
  updateDiagnosticBookingStatus,
  updateDiagnosticBookingReport,
  updateDiagnosticBookingPaymentStatus
};
