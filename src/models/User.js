const pool = require('../config/database');
const bcrypt = require('bcryptjs');

const createUser = async (userData) => {
  const { phone, email, password, name, profile_photo, role, language_preference, emergency_contact } = userData;
  const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

  const query = `
    INSERT INTO users (phone, email, password, name, profile_photo, role, language_preference, emergency_contact)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `;
  const values = [phone || null, email, hashedPassword, name, profile_photo, role || 'USER', language_preference, emergency_contact];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const findByPhone = async (phone) => {
  const query = 'SELECT * FROM users WHERE phone = $1';
  const result = await pool.query(query, [phone]);
  return result.rows[0];
};

const findByEmail = async (email) => {
  const query = 'SELECT * FROM users WHERE email = $1';
  const result = await pool.query(query, [email]);
  return result.rows[0];
};

const findById = async (id) => {
  const query = 'SELECT * FROM users WHERE id = $1';
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

const updateUser = async (id, userData) => {
  const { name, email, profile_photo, language_preference, emergency_contact, address } = userData;
  const query = `
    UPDATE users 
    SET name = $1, email = $2, profile_photo = $3, language_preference = $4, 
        emergency_contact = $5, address = $6, updated_at = CURRENT_TIMESTAMP
    WHERE id = $7
    RETURNING *
  `;
  const values = [name, email, profile_photo, language_preference, emergency_contact, address, id];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const updatePassword = async (id, newPassword) => {
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  const query = `
    UPDATE users 
    SET password = $1, updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING *
  `;
  const result = await pool.query(query, [hashedPassword, id]);
  return result.rows[0];
};

const verifyPassword = async (plainPassword, hashedPassword) => {
  return await bcrypt.compare(plainPassword, hashedPassword);
};

const setVerified = async (id) => {
  const query = `
    UPDATE users 
    SET is_verified = true, updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING *
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

const updateStatus = async (id, status) => {
  const query = `
    UPDATE users 
    SET status = $1, updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING *
  `;
  const result = await pool.query(query, [status, id]);
  return result.rows[0];
};

const deleteUser = async (id) => {
  const query = 'DELETE FROM users WHERE id = $1 RETURNING *';
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

const findAll = async (filters = {}) => {
  let query = 'SELECT id, phone, email, name, profile_photo, role, status, is_verified, created_at FROM users WHERE 1=1';
  const values = [];
  let paramCount = 0;

  if (filters.role) {
    paramCount++;
    query += ` AND role = $${paramCount}`;
    values.push(filters.role);
  }

  if (filters.status) {
    paramCount++;
    query += ` AND status = $${paramCount}`;
    values.push(filters.status);
  }

  if (filters.is_verified !== undefined) {
    paramCount++;
    query += ` AND is_verified = $${paramCount}`;
    values.push(filters.is_verified);
  }

  query += ' ORDER BY created_at DESC';

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

const findByEmailAndPassword = async (email, password) => {
  const query = 'SELECT * FROM users WHERE email = $1';
  const result = await pool.query(query, [email]);
  return result.rows[0];
};

module.exports = {
  createUser,
  findByPhone,
  findByEmail,
  findById,
  updateUser,
  updatePassword,
  verifyPassword,
  setVerified,
  updateStatus,
  deleteUser,
  findAll,
  findByEmailAndPassword
};
