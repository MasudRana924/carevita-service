const pool = require('../config/database');

const createSupportTicket = async (ticketData) => {
  const {
    user_id, subject, description, category, priority
  } = ticketData;

  const ticket_number = `TK${Date.now()}${Math.floor(Math.random() * 1000)}`;

  const query = `
    INSERT INTO support_tickets (
      ticket_number, user_id, subject, description, category, priority
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `;
  const values = [ticket_number, user_id, subject, description, category, priority];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const findSupportTicketById = async (id) => {
  const query = `
    SELECT st.*, u.name as user_name, u.phone as user_phone,
      au.name as assigned_to_name
    FROM support_tickets st
    JOIN users u ON st.user_id = u.id
    LEFT JOIN users au ON st.assigned_to = au.id
    WHERE st.id = $1
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

const findSupportTicketByNumber = async (ticket_number) => {
  const query = `
    SELECT st.*, u.name as user_name, u.phone as user_phone,
      au.name as assigned_to_name
    FROM support_tickets st
    JOIN users u ON st.user_id = u.id
    LEFT JOIN users au ON st.assigned_to = au.id
    WHERE st.ticket_number = $1
  `;
  const result = await pool.query(query, [ticket_number]);
  return result.rows[0];
};

const findSupportTicketsByUserId = async (user_id, filters = {}) => {
  let query = `
    SELECT st.*, au.name as assigned_to_name
    FROM support_tickets st
    LEFT JOIN users au ON st.assigned_to = au.id
    WHERE st.user_id = $1
  `;
  const values = [user_id];
  let paramCount = 1;

  if (filters.status) {
    paramCount++;
    query += ` AND st.status = $${paramCount}`;
    values.push(filters.status);
  }

  if (filters.category) {
    paramCount++;
    query += ` AND st.category = $${paramCount}`;
    values.push(filters.category);
  }

  query += ' ORDER BY st.created_at DESC';

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

const findAllSupportTickets = async (filters = {}) => {
  let query = `
    SELECT st.*, u.name as user_name, u.phone as user_phone,
      au.name as assigned_to_name
    FROM support_tickets st
    JOIN users u ON st.user_id = u.id
    LEFT JOIN users au ON st.assigned_to = au.id
    WHERE 1=1
  `;
  const values = [];
  let paramCount = 0;

  if (filters.status) {
    paramCount++;
    query += ` AND st.status = $${paramCount}`;
    values.push(filters.status);
  }

  if (filters.category) {
    paramCount++;
    query += ` AND st.category = $${paramCount}`;
    values.push(filters.category);
  }

  if (filters.priority) {
    paramCount++;
    query += ` AND st.priority = $${paramCount}`;
    values.push(filters.priority);
  }

  if (filters.assigned_to) {
    paramCount++;
    query += ` AND st.assigned_to = $${paramCount}`;
    values.push(filters.assigned_to);
  }

  query += ' ORDER BY st.created_at DESC';

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

const updateSupportTicket = async (id, ticketData) => {
  const { subject, description, category, priority } = ticketData;

  const query = `
    UPDATE support_tickets 
    SET subject = $1, description = $2, category = $3, priority = $4,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $5
    RETURNING *
  `;
  const values = [subject, description, category, priority, id];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const updateSupportTicketStatus = async (id, status) => {
  const query = `
    UPDATE support_tickets 
    SET status = $1, updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING *
  `;
  const result = await pool.query(query, [status, id]);
  return result.rows[0];
};

const assignSupportTicket = async (id, assigned_to) => {
  const query = `
    UPDATE support_tickets 
    SET assigned_to = $1, status = 'assigned', updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING *
  `;
  const result = await pool.query(query, [assigned_to, id]);
  return result.rows[0];
};

const resolveSupportTicket = async (id, resolution) => {
  const query = `
    UPDATE support_tickets 
    SET status = 'resolved', resolution = $1, resolved_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING *
  `;
  const result = await pool.query(query, [resolution, id]);
  return result.rows[0];
};

const getSupportTicketStats = async () => {
  const query = `
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'open') as open,
      COUNT(*) FILTER (WHERE status = 'assigned') as assigned,
      COUNT(*) FILTER (WHERE status = 'investigating') as investigating,
      COUNT(*) FILTER (WHERE status = 'resolved') as resolved
    FROM support_tickets
  `;
  const result = await pool.query(query);
  return result.rows[0];
};

module.exports = {
  createSupportTicket,
  findSupportTicketById,
  findSupportTicketByNumber,
  findSupportTicketsByUserId,
  findAllSupportTickets,
  updateSupportTicket,
  updateSupportTicketStatus,
  assignSupportTicket,
  resolveSupportTicket,
  getSupportTicketStats
};
