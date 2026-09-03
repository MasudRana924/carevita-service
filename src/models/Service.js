const pool = require('../config/database');

const createService = async (serviceData) => {
  const { name, category, description, base_price, duration } = serviceData;

  const query = `
    INSERT INTO services (name, category, description, base_price, duration)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `;
  const values = [name, category, description, base_price, duration];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const findById = async (id) => {
  const query = 'SELECT * FROM services WHERE id = $1';
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

const findAll = async (filters = {}) => {
  let query = 'SELECT * FROM services WHERE 1=1';
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

const updateService = async (id, serviceData) => {
  const { name, category, description, base_price, duration, is_active } = serviceData;

  const query = `
    UPDATE services 
    SET name = $1, category = $2, description = $3, base_price = $4,
        duration = $5, is_active = $6, updated_at = CURRENT_TIMESTAMP
    WHERE id = $7
    RETURNING *
  `;
  const values = [name, category, description, base_price, duration, is_active, id];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const deleteService = async (id) => {
  const query = 'DELETE FROM services WHERE id = $1 RETURNING *';
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

const findByCategory = async (category) => {
  const query = 'SELECT * FROM services WHERE category = $1 AND is_active = true ORDER BY name ASC';
  const result = await pool.query(query, [category]);
  return result.rows;
};

module.exports = {
  createService,
  findById,
  findAll,
  updateService,
  deleteService,
  findByCategory
};
