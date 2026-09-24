const pool = require('../config/database');

const createConversation = async ({
  user_id,
  admin_id = null,
  subject = null,
  status = 'active'
}) => {
  const query = `
    INSERT INTO conversations (user_id, admin_id, subject, status)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `;
  const values = [user_id, admin_id, subject, status];
  const result = await pool.query(query, values);
  return result.rows[0];
};

const findConversationByUserId = async (user_id) => {
  const query = `
    SELECT c.*, 
           u.name as user_name, 
           u.phone as user_phone, 
           u.role as user_role,
           a.name as admin_name,
           a.phone as admin_phone
    FROM conversations c
    LEFT JOIN users u ON c.user_id = u.id
    LEFT JOIN users a ON c.admin_id = a.id
    WHERE c.user_id = $1
    ORDER BY c.last_message_at DESC NULLS LAST, c.created_at DESC
  `;
  const result = await pool.query(query, [user_id]);
  return result.rows;
};

const findAllConversationsForAdmin = async (filters = {}) => {
  let query = `
    SELECT c.*, 
           u.name as user_name, 
           u.phone as user_phone, 
           u.role as user_role,
           a.name as admin_name,
           a.phone as admin_phone
    FROM conversations c
    LEFT JOIN users u ON c.user_id = u.id
    LEFT JOIN users a ON c.admin_id = a.id
    WHERE 1=1
  `;
  const values = [];
  let paramCount = 0;

  if (filters.status) {
    paramCount++;
    query += ` AND c.status = $${paramCount}`;
    values.push(filters.status);
  }

  if (filters.user_role) {
    paramCount++;
    query += ` AND u.role = $${paramCount}`;
    values.push(filters.user_role);
  }

  query += ' ORDER BY c.last_message_at DESC NULLS LAST, c.created_at DESC';

  if (filters.limit) {
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    values.push(parseInt(filters.limit));
  }

  if (filters.offset) {
    paramCount++;
    query += ` OFFSET $${paramCount}`;
    values.push(parseInt(filters.offset));
  }

  const result = await pool.query(query, values);
  return result.rows;
};

const findConversationById = async (id) => {
  const query = `
    SELECT c.*, 
           u.name as user_name, 
           u.phone as user_phone, 
           u.role as user_role,
           a.name as admin_name,
           a.phone as admin_phone
    FROM conversations c
    LEFT JOIN users u ON c.user_id = u.id
    LEFT JOIN users a ON c.admin_id = a.id
    WHERE c.id = $1
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

const updateConversation = async (id, updates) => {
  const fields = [];
  const values = [];
  let paramCount = 0;

  Object.keys(updates).forEach(key => {
    if (updates[key] !== undefined) {
      paramCount++;
      fields.push(`${key} = $${paramCount}`);
      values.push(updates[key]);
    }
  });

  if (fields.length === 0) return null;

  paramCount++;
  values.push(id);
  
  const query = `
    UPDATE conversations 
    SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
    WHERE id = $${paramCount}
    RETURNING *
  `;

  const result = await pool.query(query, values);
  return result.rows[0];
};

const assignAdminToConversation = async (conversation_id, admin_id) => {
  return updateConversation(conversation_id, { admin_id });
};

const updateConversationStatus = async (conversation_id, status) => {
  return updateConversation(conversation_id, { status });
};

const countConversationsForAdmin = async (filters = {}) => {
  let query = `
    SELECT COUNT(*)::int as count
    FROM conversations c
    LEFT JOIN users u ON c.user_id = u.id
    WHERE 1=1
  `;
  const values = [];
  let paramCount = 0;

  if (filters.status) {
    paramCount++;
    query += ` AND c.status = $${paramCount}`;
    values.push(filters.status);
  }

  if (filters.user_role) {
    paramCount++;
    query += ` AND u.role = $${paramCount}`;
    values.push(filters.user_role);
  }

  const result = await pool.query(query, values);
  return result.rows[0].count;
};

const getUnreadCountForUser = async (user_id) => {
  const query = `
    SELECT COALESCE(SUM(user_unread_count), 0)::int as count
    FROM conversations
    WHERE user_id = $1 AND status = 'active'
  `;
  const result = await pool.query(query, [user_id]);
  return result.rows[0].count;
};

const getUnreadCountForAdmin = async () => {
  const query = `
    SELECT COALESCE(SUM(admin_unread_count), 0)::int as count
    FROM conversations
    WHERE status = 'active'
  `;
  const result = await pool.query(query);
  return result.rows[0].count;
};

module.exports = {
  createConversation,
  findConversationByUserId,
  findAllConversationsForAdmin,
  findConversationById,
  updateConversation,
  assignAdminToConversation,
  updateConversationStatus,
  countConversationsForAdmin,
  getUnreadCountForUser,
  getUnreadCountForAdmin
};
