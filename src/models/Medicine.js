const pool = require('../config/database');

const createMedicine = async (medicineData) => {
  const {
    name, generic_name, manufacturer, category, description,
    strength, form, is_prescription_required
  } = medicineData;

  const query = `
    INSERT INTO medicines (
      name, generic_name, manufacturer, category, description,
      strength, form, is_prescription_required
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `;
  const values = [
    name, generic_name, manufacturer, category, description,
    strength, form, is_prescription_required
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const findById = async (id) => {
  const query = 'SELECT * FROM medicines WHERE id = $1';
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

const findAll = async (filters = {}) => {
  let query = 'SELECT * FROM medicines WHERE 1=1';
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

  if (filters.is_prescription_required !== undefined) {
    paramCount++;
    query += ` AND is_prescription_required = $${paramCount}`;
    values.push(filters.is_prescription_required);
  }

  query += ' ORDER BY name ASC';

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

const search = async (query, filters = {}) => {
  let sql = `
    SELECT * FROM medicines 
    WHERE (name ILIKE $1 OR generic_name ILIKE $1 OR manufacturer ILIKE $1)
  `;
  const values = [`%${query}%`];
  let paramCount = 1;

  if (filters.is_active !== undefined) {
    paramCount++;
    sql += ` AND is_active = $${paramCount}`;
    values.push(filters.is_active);
  }

  if (filters.category) {
    paramCount++;
    sql += ` AND category = $${paramCount}`;
    values.push(filters.category);
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

const updateMedicine = async (id, medicineData) => {
  const {
    name, generic_name, manufacturer, category, description,
    strength, form, is_prescription_required, is_active
  } = medicineData;

  const query = `
    UPDATE medicines 
    SET name = $1, generic_name = $2, manufacturer = $3, category = $4,
        description = $5, strength = $6, form = $7, is_prescription_required = $8,
        is_active = $9, updated_at = CURRENT_TIMESTAMP
    WHERE id = $10
    RETURNING *
  `;
  const values = [
    name, generic_name, manufacturer, category, description,
    strength, form, is_prescription_required, is_active, id
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const deleteMedicine = async (id) => {
  const query = 'DELETE FROM medicines WHERE id = $1 RETURNING *';
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

module.exports = {
  createMedicine,
  findById,
  findAll,
  search,
  updateMedicine,
  deleteMedicine
};
