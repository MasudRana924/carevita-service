const pool = require('../config/database');

// Conversation operations
const createConversation = async ({ user_id, subject }) => {
  const query = `
    INSERT INTO conversations (user_id, subject, user_unread_count, admin_unread_count)
    VALUES ($1, $2, 0, 0)
    RETURNING *
  `;
  const values = [user_id, subject];
  const result = await pool.query(query, values);
  return result.rows[0];
};

const getConversationsByUserId = async (user_id, filters = {}) => {
  let query = `
    SELECT c.*, 
           (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id) as message_count
    FROM conversations c
    WHERE c.user_id = $1
  `;
  const values = [user_id];
  let paramCount = 1;

  if (filters.status) {
    paramCount++;
    query += ` AND c.status = $${paramCount}`;
    values.push(filters.status);
  }

  query += ' ORDER BY c.updated_at DESC';

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

const getAllConversations = async (filters = {}) => {
  let query = `
    SELECT c.*, 
           u.name as user_name,
           u.phone as user_phone,
           u.email as user_email,
           (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id) as message_count
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

  if (filters.search) {
    paramCount++;
    query += ` AND (u.name ILIKE $${paramCount} OR u.phone ILIKE $${paramCount} OR u.email ILIKE $${paramCount} OR c.subject ILIKE $${paramCount})`;
    values.push(`%${filters.search}%`);
  }

  query += ' ORDER BY c.updated_at DESC';

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

const getConversationById = async (id) => {
  const query = `
    SELECT c.*, 
           u.name as user_name,
           u.phone as user_phone,
           u.email as user_email
    FROM conversations c
    LEFT JOIN users u ON c.user_id = u.id
    WHERE c.id = $1
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

const getConversationByIdForUser = async (id, user_id) => {
  const query = `
    SELECT c.* 
    FROM conversations c
    WHERE c.id = $1 AND c.user_id = $2
  `;
  const result = await pool.query(query, [id, user_id]);
  return result.rows[0];
};

const updateConversationStatus = async (id, status) => {
  const query = `
    UPDATE conversations 
    SET status = $1, updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING *
  `;
  const result = await pool.query(query, [status, id]);
  return result.rows[0];
};

const updateConversationUnreadCounts = async (conversation_id) => {
  const query = `
    UPDATE conversations 
    SET 
      user_unread_count = (SELECT COUNT(*) FROM messages WHERE conversation_id = $1 AND sender_role = 'admin' AND is_read = false),
      admin_unread_count = (SELECT COUNT(*) FROM messages WHERE conversation_id = $1 AND sender_role = 'user' AND is_read = false),
      last_message_at = (SELECT created_at FROM messages WHERE conversation_id = $1 ORDER BY created_at DESC LIMIT 1),
      last_message_preview = (SELECT message FROM messages WHERE conversation_id = $1 ORDER BY created_at DESC LIMIT 1),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING *
  `;
  const result = await pool.query(query, [conversation_id]);
  return result.rows[0];
};

const countConversations = async (filters = {}) => {
  let query = 'SELECT COUNT(*)::int AS count FROM conversations c LEFT JOIN users u ON c.user_id = u.id WHERE 1=1';
  const values = [];
  let paramCount = 0;

  if (filters.status) {
    paramCount++;
    query += ` AND c.status = $${paramCount}`;
    values.push(filters.status);
  }

  if (filters.search) {
    paramCount++;
    query += ` AND (u.name ILIKE $${paramCount} OR u.phone ILIKE $${paramCount} OR u.email ILIKE $${paramCount} OR c.subject ILIKE $${paramCount})`;
    values.push(`%${filters.search}%`);
  }

  const result = await pool.query(query, values);
  return result.rows[0].count;
};

const countUserConversations = async (user_id, filters = {}) => {
  let query = 'SELECT COUNT(*)::int AS count FROM conversations WHERE user_id = $1';
  const values = [user_id];
  let paramCount = 1;

  if (filters.status) {
    paramCount++;
    query += ` AND status = $${paramCount}`;
    values.push(filters.status);
  }

  const result = await pool.query(query, values);
  return result.rows[0].count;
};

// Message operations
const createMessage = async ({ conversation_id, sender_id, sender_role, message_type, message }) => {
  const query = `
    INSERT INTO messages (conversation_id, sender_id, sender_role, message_type, message)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `;
  const values = [
    conversation_id,
    sender_id,
    sender_role,
    message_type,
    message
  ];
  const result = await pool.query(query, values);
  
  // Update conversation metadata
  await updateConversationUnreadCounts(conversation_id);
  
  return result.rows[0];
};

const getMessagesByConversationId = async (conversation_id, filters = {}) => {
  let query = 'SELECT * FROM messages WHERE conversation_id = $1';
  const values = [conversation_id];
  let paramCount = 1;

  if (filters.sender_role) {
    paramCount++;
    query += ` AND sender_role = $${paramCount}`;
    values.push(filters.sender_role);
  }

  query += ' ORDER BY created_at ASC';

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

const markMessagesAsRead = async (conversation_id, sender_role) => {
  const query = `
    UPDATE messages 
    SET is_read = true, read_at = CURRENT_TIMESTAMP
    WHERE conversation_id = $1 AND sender_role = $2 AND is_read = false
    RETURNING *
  `;
  const result = await pool.query(query, [conversation_id, sender_role]);
  
  // Update conversation unread counts
  await updateConversationUnreadCounts(conversation_id);
  
  return result.rows;
};

const getUnreadMessageCount = async (conversation_id, sender_role) => {
  const query = `
    SELECT COUNT(*)::int AS count 
    FROM messages 
    WHERE conversation_id = $1 AND sender_role = $2 AND is_read = false
  `;
  const result = await pool.query(query, [conversation_id, sender_role]);
  return result.rows[0].count;
};

module.exports = {
  // Conversation operations
  createConversation,
  getConversationsByUserId,
  getAllConversations,
  getConversationById,
  getConversationByIdForUser,
  updateConversationStatus,
  updateConversationUnreadCounts,
  countConversations,
  countUserConversations,
  
  // Message operations
  createMessage,
  getMessagesByConversationId,
  markMessagesAsRead,
  getUnreadMessageCount
};
