const pool = require('../config/database');

const createHospital = async (hospitalData) => {
  const {
    name, address, phone, email, location_lat, location_long,
    city, district, type
  } = hospitalData;

  const query = `
    INSERT INTO hospitals (
      name, address, phone, email, location_lat, location_long,
      city, district, type
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *
  `;
  const values = [
    name, address, phone, email, location_lat, location_long,
    city, district, type
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const findById = async (id) => {
  const query = 'SELECT * FROM hospitals WHERE id = $1';
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

const findAll = async (filters = {}) => {
  let query = 'SELECT * FROM hospitals WHERE 1=1';
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

  if (filters.type) {
    paramCount++;
    query += ` AND type = $${paramCount}`;
    values.push(filters.type);
  }

  query += ' ORDER BY rating DESC, name ASC';

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

const updateHospital = async (id, hospitalData) => {
  const {
    name, address, phone, email, location_lat, location_long,
    city, district, type, is_active
  } = hospitalData;

  const query = `
    UPDATE hospitals 
    SET name = $1, address = $2, phone = $3, email = $4, location_lat = $5,
        location_long = $6, city = $7, district = $8, type = $9,
        is_active = $10, updated_at = CURRENT_TIMESTAMP
    WHERE id = $11
    RETURNING *
  `;
  const values = [
    name, address, phone, email, location_lat, location_long,
    city, district, type, is_active, id
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const updateVerification = async (id, is_verified) => {
  const query = `
    UPDATE hospitals 
    SET is_verified = $1, updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING *
  `;
  const result = await pool.query(query, [is_verified, id]);
  return result.rows[0];
};

const updateRating = async (id, rating) => {
  const query = `
    UPDATE hospitals 
    SET rating = $1, updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING *
  `;
  const result = await pool.query(query, [rating, id]);
  return result.rows[0];
};

const search = async (query, filters = {}) => {
  let sql = `
    SELECT * FROM hospitals 
    WHERE (name ILIKE $1 OR address ILIKE $1 OR city ILIKE $1 OR district ILIKE $1)
  `;
  const values = [`%${query}%`];
  let paramCount = 1;

  if (filters.is_active !== undefined) {
    paramCount++;
    sql += ` AND is_active = $${paramCount}`;
    values.push(filters.is_active);
  }

  if (filters.is_verified !== undefined) {
    paramCount++;
    sql += ` AND is_verified = $${paramCount}`;
    values.push(filters.is_verified);
  }

  sql += ' ORDER BY rating DESC, name ASC';

  if (filters.limit) {
    paramCount++;
    sql += ` LIMIT $${paramCount}`;
    values.push(filters.limit);
  }

  const result = await pool.query(sql, values);
  return result.rows;
};

const findNearby = async (lat, long, radius, filters = {}) => {
  let query = `
    SELECT *, (
      6371 * acos(cos(radians($1)) * cos(radians(location_lat)) * 
      cos(radians(location_long) - radians($2)) + 
      sin(radians($1)) * sin(radians(location_lat)))
    ) as distance
    FROM hospitals
    WHERE is_active = true
  `;
  const values = [lat, long];
  let paramCount = 2;

  if (filters.type) {
    paramCount++;
    query += ` AND type = $${paramCount}`;
    values.push(filters.type);
  }

  query += ` HAVING distance <= $${paramCount + 1}`;
  values.push(radius);
  paramCount++;

  query += ' ORDER BY distance ASC';

  if (filters.limit) {
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    values.push(filters.limit);
  }

  const result = await pool.query(query, values);
  return result.rows;
};

module.exports = {
  createHospital,
  findById,
  findAll,
  updateHospital,
  updateVerification,
  updateRating,
  search,
  findNearby
};
