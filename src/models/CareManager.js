const pool = require('../config/database');

// Care Manager functions
const createCareManager = async (managerData) => {
  const {
    user_id, name, photo, phone, email, specialization, experience
  } = managerData;

  const query = `
    INSERT INTO care_managers (
      user_id, name, photo, phone, email, specialization, experience
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `;
  const values = [user_id, name, photo, phone, email, specialization, experience];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const findCareManagerById = async (id) => {
  const query = 'SELECT * FROM care_managers WHERE id = $1';
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

const findCareManagerByUserId = async (user_id) => {
  const query = 'SELECT * FROM care_managers WHERE user_id = $1';
  const result = await pool.query(query, [user_id]);
  return result.rows[0];
};

const findAllCareManagers = async (filters = {}) => {
  let query = 'SELECT * FROM care_managers WHERE 1=1';
  const values = [];
  let paramCount = 0;

  if (filters.is_available !== undefined) {
    paramCount++;
    query += ` AND is_available = $${paramCount}`;
    values.push(filters.is_available);
  }

  query += ' ORDER BY rating DESC, assigned_customers ASC';

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

const updateCareManager = async (id, managerData) => {
  const {
    name, photo, phone, email, specialization, experience, is_available
  } = managerData;

  const query = `
    UPDATE care_managers 
    SET name = $1, photo = $2, phone = $3, email = $4, specialization = $5,
        experience = $6, is_available = $7, updated_at = CURRENT_TIMESTAMP
    WHERE id = $8
    RETURNING *
  `;
  const values = [
    name, photo, phone, email, specialization, experience, is_available, id
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const updateCareManagerRating = async (id, rating) => {
  const query = `
    UPDATE care_managers 
    SET rating = $1, updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING *
  `;
  const result = await pool.query(query, [rating, id]);
  return result.rows[0];
};

const incrementCareManagerAssignedCustomers = async (id) => {
  const query = `
    UPDATE care_managers 
    SET assigned_customers = assigned_customers + 1, updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING *
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

const decrementCareManagerAssignedCustomers = async (id) => {
  const query = `
    UPDATE care_managers 
    SET assigned_customers = GREATEST(assigned_customers - 1, 0), updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING *
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

const getAvailableCareManagers = async () => {
  const query = `
    SELECT * FROM care_managers 
    WHERE is_available = true
    ORDER BY rating DESC, assigned_customers ASC
  `;
  const result = await pool.query(query);
  return result.rows;
};

// Care Manager Assignment functions
const createCareManagerAssignment = async (assignmentData) => {
  const { care_manager_id, user_id, notes } = assignmentData;

  const query = `
    INSERT INTO care_manager_assignments (care_manager_id, user_id, notes)
    VALUES ($1, $2, $3)
    RETURNING *
  `;
  const values = [care_manager_id, user_id, notes];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const findCareManagerAssignmentById = async (id) => {
  const query = `
    SELECT cma.*, cm.name as care_manager_name, u.name as user_name, u.phone as user_phone
    FROM care_manager_assignments cma
    JOIN care_managers cm ON cma.care_manager_id = cm.id
    JOIN users u ON cma.user_id = u.id
    WHERE cma.id = $1
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

const findCareManagerAssignmentByUserId = async (user_id) => {
  const query = `
    SELECT cma.*, cm.name as care_manager_name, cm.photo as care_manager_photo,
      cm.phone as care_manager_phone, cm.email as care_manager_email
    FROM care_manager_assignments cma
    JOIN care_managers cm ON cma.care_manager_id = cm.id
    WHERE cma.user_id = $1 AND cma.status = 'active'
    ORDER BY cma.assigned_at DESC
    LIMIT 1
  `;
  const result = await pool.query(query, [user_id]);
  return result.rows[0];
};

const findCareManagerAssignmentsByManagerId = async (care_manager_id, filters = {}) => {
  let query = `
    SELECT cma.*, u.name as user_name, u.phone as user_phone
    FROM care_manager_assignments cma
    JOIN users u ON cma.user_id = u.id
    WHERE cma.care_manager_id = $1
  `;
  const values = [care_manager_id];
  let paramCount = 1;

  if (filters.status) {
    paramCount++;
    query += ` AND cma.status = $${paramCount}`;
    values.push(filters.status);
  }

  query += ' ORDER BY cma.assigned_at DESC';

  if (filters.limit) {
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    values.push(filters.limit);
  }

  const result = await pool.query(query, values);
  return result.rows;
};

const updateCareManagerAssignment = async (id, assignmentData) => {
  const { status, notes } = assignmentData;

  const query = `
    UPDATE care_manager_assignments 
    SET status = $1, notes = $2, updated_at = CURRENT_TIMESTAMP
    WHERE id = $3
    RETURNING *
  `;
  const values = [status, notes, id];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const deactivateCareManagerAssignmentByUserId = async (user_id) => {
  const query = `
    UPDATE care_manager_assignments 
    SET status = 'inactive', updated_at = CURRENT_TIMESTAMP
    WHERE user_id = $1 AND status = 'active'
    RETURNING *
  `;
  const result = await pool.query(query, [user_id]);
  return result.rows;
};

module.exports = {
  // Care Manager
  createCareManager,
  findCareManagerById,
  findCareManagerByUserId,
  findAllCareManagers,
  updateCareManager,
  updateCareManagerRating,
  incrementCareManagerAssignedCustomers,
  decrementCareManagerAssignedCustomers,
  getAvailableCareManagers,
  // Care Manager Assignment
  createCareManagerAssignment,
  findCareManagerAssignmentById,
  findCareManagerAssignmentByUserId,
  findCareManagerAssignmentsByManagerId,
  updateCareManagerAssignment,
  deactivateCareManagerAssignmentByUserId
};
