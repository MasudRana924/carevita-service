const pool = require('../config/database');

const createEmergency = async (emergencyData) => {
  const {
    user_id, family_member_id, emergency_type, location,
    location_lat, location_long, description, emergency_contact
  } = emergencyData;

  const query = `
    INSERT INTO emergencies (
      user_id, family_member_id, emergency_type, location,
      location_lat, location_long, description, emergency_contact
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `;
  const values = [
    user_id, family_member_id, emergency_type, location,
    location_lat, location_long, description, emergency_contact
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const findEmergencyById = async (id) => {
  const query = `
    SELECT e.*, 
      u.name as user_name, u.phone as user_phone,
      fm.name as family_member_name, fm.photo as family_member_photo
    FROM emergencies e
    JOIN users u ON e.user_id = u.id
    LEFT JOIN family_members fm ON e.family_member_id = fm.id
    WHERE e.id = $1
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

const findEmergenciesByUserId = async (user_id, filters = {}) => {
  let query = `
    SELECT e.*, fm.name as family_member_name, fm.photo as family_member_photo
    FROM emergencies e
    LEFT JOIN family_members fm ON e.family_member_id = fm.id
    WHERE e.user_id = $1
  `;
  const values = [user_id];
  let paramCount = 1;

  if (filters.status) {
    paramCount++;
    query += ` AND e.status = $${paramCount}`;
    values.push(filters.status);
  }

  query += ' ORDER BY e.created_at DESC';

  if (filters.limit) {
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    values.push(filters.limit);
  }

  const result = await pool.query(query, values);
  return result.rows;
};

const findAllEmergencies = async (filters = {}) => {
  let query = `
    SELECT e.*, u.name as user_name, u.phone as user_phone,
      fm.name as family_member_name
    FROM emergencies e
    JOIN users u ON e.user_id = u.id
    LEFT JOIN family_members fm ON e.family_member_id = fm.id
    WHERE 1=1
  `;
  const values = [];
  let paramCount = 0;

  if (filters.status) {
    paramCount++;
    query += ` AND e.status = $${paramCount}`;
    values.push(filters.status);
  }

  query += ' ORDER BY e.created_at DESC';

  if (filters.limit) {
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    values.push(filters.limit);
  }

  const result = await pool.query(query, values);
  return result.rows;
};

const updateEmergency = async (id, emergencyData) => {
  const {
    location, location_lat, location_long, description, emergency_contact
  } = emergencyData;

  const query = `
    UPDATE emergencies 
    SET location = $1, location_lat = $2, location_long = $3,
        description = $4, emergency_contact = $5, updated_at = CURRENT_TIMESTAMP
    WHERE id = $6
    RETURNING *
  `;
  const values = [location, location_lat, location_long, description, emergency_contact, id];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const assignEmergencyProvider = async (id, provider_id, provider_type) => {
  const query = `
    UPDATE emergencies 
    SET assigned_provider_id = $1, assigned_provider_type = $2,
        status = 'assigned', updated_at = CURRENT_TIMESTAMP
    WHERE id = $3
    RETURNING *
  `;
  const result = await pool.query(query, [provider_id, provider_type, id]);
  return result.rows[0];
};

const resolveEmergency = async (id) => {
  const query = `
    UPDATE emergencies 
    SET status = 'resolved', resolved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING *
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

const getActiveEmergencies = async () => {
  const query = `
    SELECT e.*, u.name as user_name, u.phone as user_phone,
      fm.name as family_member_name, fm.photo as family_member_photo
    FROM emergencies e
    JOIN users u ON e.user_id = u.id
    LEFT JOIN family_members fm ON e.family_member_id = fm.id
    WHERE e.status = 'active'
    ORDER BY e.created_at ASC
  `;
  const result = await pool.query(query);
  return result.rows;
};

module.exports = {
  createEmergency,
  findEmergencyById,
  findEmergenciesByUserId,
  findAllEmergencies,
  updateEmergency,
  assignEmergencyProvider,
  resolveEmergency,
  getActiveEmergencies
};
