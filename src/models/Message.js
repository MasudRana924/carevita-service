const pool = require('../config/database');

const createMessage = async ({
  conversation_id,
  sender_id,
  sender_role,
  message,
  message_type = 'text'
}) => {
  const query = `
    INSERT INTO messages (conversation_id, sender_id, sender_role, message, message_type)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `;
  const values = [conversation_id, sender_id, sender_role, message, message_type];
  const result = await pool.query(query, values);
  return result.rows[0];
};

const findMessagesByConversationId = async (conversation_id, filters = {}) => {
  let query = `
    SELECT m.*, 
           u.name as sender_name,
           u.phone as sender_phone,
           u.role as sender_role
    FROM messages m
    LEFT JOIN users u ON m.sender_id = u.id
    WHERE m.conversation_id = $1
  `;
  const values = [conversation_id];
  let paramCount = 1;

  if (filters.is_read !== undefined) {
    paramCount++;
    query += ` AND m.is_read = $${paramCount}`;
    values.push(filters.is_read === true || filters.is_read === 'true');
  }

  query += ' ORDER BY m.created_at ASC';

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

const findMessageById = async (id) => {
  const query = `
    SELECT m.*, 
           u.name as sender_name,
           u.phone as sender_phone,
           u.role as sender_role
    FROM messages m
    LEFT JOIN users u ON m.sender_id = u.id
    WHERE m.id = $1
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

const markMessageAsRead = async (id, reader_id) => {
  const query = `
    UPDATE messages 
    SET is_read = true, read_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE id = $1 AND sender_id != $2
    RETURNING *
  `;
  const result = await pool.query(query, [id, reader_id]);
  return result.rows[0];
};

const markConversationMessagesAsRead = async (conversation_id, reader_id) => {
  const query = `
    UPDATE messages 
    SET is_read = true, read_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE conversation_id = $1 AND sender_id != $2 AND is_read = false
    RETURNING *
  `;
  const result = await pool.query(query, [conversation_id, reader_id]);
  return result.rows;
};

const countMessagesByConversationId = async (conversation_id) => {
  const query = 'SELECT COUNT(*)::int as count FROM messages WHERE conversation_id = $1';
  const result = await pool.query(query, [conversation_id]);
  return result.rows[0].count;
};

const getUnreadMessagesByConversation = async (conversation_id, user_id) => {
  const query = `
    SELECT COUNT(*)::int as count
    FROM messages
    WHERE conversation_id = $1 AND sender_id != $2 AND is_read = false
  `;
  const result = await pool.query(query, [conversation_id, user_id]);
  return result.rows[0].count;
};

const deleteMessage = async (id, user_id) => {
  const query = `
    DELETE FROM messages 
    WHERE id = $1 AND sender_id = $2
    RETURNING *
  `;
  const result = await pool.query(query, [id, user_id]);
  return result.rows[0];
};

module.exports = {
  createMessage,
  findMessagesByConversationId,
  findMessageById,
  markMessageAsRead,
  markConversationMessagesAsRead,
  countMessagesByConversationId,
  getUnreadMessagesByConversation,
  deleteMessage
};
