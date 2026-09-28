const pool = require('../config/database');

const MESSAGE_COLUMNS = `
  m.id, m.conversation_id, m.sender_id, m.sender_role, m.message_type, m.message,
  m.attachment_url, m.attachment_name, m.attachment_mime, m.attachment_size,
  m.client_message_id, m.is_read, m.read_at, m.created_at, m.updated_at,
  u.name AS sender_name, u.profile_photo AS sender_photo
`;

const CONVERSATION_WITH_USER = `
  SELECT c.*,
         u.name AS user_name,
         u.phone AS user_phone,
         u.email AS user_email,
         u.profile_photo AS user_photo,
         u.role AS user_role
  FROM conversations c
  LEFT JOIN users u ON c.user_id = u.id
`;

const previewFor = ({ message_type, message, attachment_name }) => {
  const text = (message || '').trim();
  if (text) return text.slice(0, 200);
  if (message_type === 'image') return 'Photo';
  return attachment_name ? `Document: ${attachment_name}` : 'Document';
};

// One conversation per user; safe under concurrent first-open because of uq_conversations_user_id.
const getOrCreateConversationForUser = async (user_id) => {
  await pool.query(
    `INSERT INTO conversations (user_id, subject, status)
     VALUES ($1, 'Support', 'active')
     ON CONFLICT (user_id) DO NOTHING`,
    [user_id]
  );
  const result = await pool.query(`${CONVERSATION_WITH_USER} WHERE c.user_id = $1`, [user_id]);
  return result.rows[0];
};

const getConversationById = async (id) => {
  const result = await pool.query(`${CONVERSATION_WITH_USER} WHERE c.id = $1`, [id]);
  return result.rows[0];
};

const buildAdminListFilters = (filters = {}) => {
  const where = ['c.last_message_at IS NOT NULL'];
  const values = [];

  if (filters.status) {
    values.push(filters.status);
    where.push(`c.status = $${values.length}`);
  }
  if (filters.unread_only) {
    where.push('c.admin_unread_count > 0');
  }
  if (filters.search) {
    values.push(`%${filters.search}%`);
    where.push(`(u.name ILIKE $${values.length} OR u.phone ILIKE $${values.length} OR u.email ILIKE $${values.length})`);
  }

  return { where: `WHERE ${where.join(' AND ')}`, values };
};

const getAllConversations = async (filters = {}) => {
  const { where, values } = buildAdminListFilters(filters);
  values.push(filters.limit || 20, filters.offset || 0);
  const result = await pool.query(
    `${CONVERSATION_WITH_USER}
     ${where}
     ORDER BY c.last_message_at DESC
     LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values
  );
  return result.rows;
};

const countConversations = async (filters = {}) => {
  const { where, values } = buildAdminListFilters(filters);
  const result = await pool.query(
    `SELECT COUNT(*)::int AS count FROM conversations c LEFT JOIN users u ON c.user_id = u.id ${where}`,
    values
  );
  return result.rows[0].count;
};

const getAdminUnreadSummary = async () => {
  const result = await pool.query(`
    SELECT COALESCE(SUM(admin_unread_count), 0)::int AS unread_messages,
           COUNT(*) FILTER (WHERE admin_unread_count > 0)::int AS unread_conversations
    FROM conversations
  `);
  return result.rows[0];
};

const updateConversationStatus = async (id, status) => {
  const result = await pool.query(
    `UPDATE conversations SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
    [status, id]
  );
  return result.rows[0];
};

const refreshConversationCounters = async (client, conversation_id) => {
  const result = await client.query(
    `UPDATE conversations SET
       user_unread_count = (SELECT COUNT(*) FROM messages WHERE conversation_id = $1 AND sender_role = 'admin' AND is_read = false),
       admin_unread_count = (SELECT COUNT(*) FROM messages WHERE conversation_id = $1 AND sender_role = 'user' AND is_read = false),
       updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING *`,
    [conversation_id]
  );
  return result.rows[0];
};

const getMessageById = async (id) => {
  const result = await pool.query(
    `SELECT ${MESSAGE_COLUMNS} FROM messages m LEFT JOIN users u ON u.id = m.sender_id WHERE m.id = $1`,
    [id]
  );
  return result.rows[0];
};

/**
 * Insert a message, mark the other side's messages as read (replying implies you saw them),
 * and update the thread's last-message metadata. Returns { message, conversation, duplicate }.
 */
const createMessage = async ({
  conversation_id,
  sender_id,
  sender_role,
  message_type = 'text',
  message = null,
  attachment = null,
  client_message_id = null
}) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    if (client_message_id) {
      const existing = await client.query(
        'SELECT id FROM messages WHERE conversation_id = $1 AND client_message_id = $2',
        [conversation_id, client_message_id]
      );
      if (existing.rows[0]) {
        await client.query('ROLLBACK');
        const [dup, conversation] = await Promise.all([
          getMessageById(existing.rows[0].id),
          getConversationById(conversation_id)
        ]);
        return { message: dup, conversation, duplicate: true };
      }
    }

    const inserted = await client.query(
      `INSERT INTO messages (
         conversation_id, sender_id, sender_role, message_type, message,
         attachment_url, attachment_name, attachment_mime, attachment_size, attachment_public_id,
         client_message_id
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id, created_at`,
      [
        conversation_id,
        sender_id,
        sender_role,
        message_type,
        message,
        attachment?.url || null,
        attachment?.name || null,
        attachment?.mime || null,
        attachment?.size || null,
        attachment?.public_id || null,
        client_message_id
      ]
    );

    const otherRole = sender_role === 'admin' ? 'user' : 'admin';
    await client.query(
      `UPDATE messages SET is_read = true, read_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE conversation_id = $1 AND sender_role = $2 AND is_read = false`,
      [conversation_id, otherRole]
    );

    await client.query(
      `UPDATE conversations SET
         last_message_at = $2,
         last_message_preview = $3,
         last_message_sender_role = $4,
         status = 'active'
       WHERE id = $1`,
      [
        conversation_id,
        inserted.rows[0].created_at,
        previewFor({ message_type, message, attachment_name: attachment?.name }),
        sender_role
      ]
    );
    await refreshConversationCounters(client, conversation_id);

    await client.query('COMMIT');

    const [created, conversation] = await Promise.all([
      getMessageById(inserted.rows[0].id),
      getConversationById(conversation_id)
    ]);
    return { message: created, conversation, duplicate: false };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Cursor pagination over one thread. Always returns messages oldest -> newest.
 * - no cursor: latest `limit` messages
 * - before=<messageId>: older history (scroll up)
 * - after=<messageId>: messages newer than the one the client already has (refresh)
 */
const getMessages = async (conversation_id, { before, after, limit = 30 } = {}) => {
  const values = [conversation_id];
  let cursorClause = '';
  let order = 'DESC';

  const cursorId = before || after;
  if (cursorId) {
    const cursor = await pool.query(
      'SELECT 1 FROM messages WHERE id = $1 AND conversation_id = $2',
      [cursorId, conversation_id]
    );
    if (!cursor.rows[0]) {
      const err = new Error('Invalid message cursor');
      err.statusCode = 400;
      throw err;
    }
    // Compare in SQL: JS Date would drop Postgres microseconds and break the cursor.
    values.push(cursorId);
    const cursorRow = '(SELECT c.created_at, c.id FROM messages c WHERE c.id = $2)';
    if (before) {
      cursorClause = `AND (m.created_at, m.id) < ${cursorRow}`;
    } else {
      cursorClause = `AND (m.created_at, m.id) > ${cursorRow}`;
      order = 'ASC';
    }
  }

  values.push(limit + 1);
  const result = await pool.query(
    `SELECT ${MESSAGE_COLUMNS}
     FROM messages m
     LEFT JOIN users u ON u.id = m.sender_id
     WHERE m.conversation_id = $1 ${cursorClause}
     ORDER BY m.created_at ${order}, m.id ${order}
     LIMIT $${values.length}`,
    values
  );

  const has_more = result.rows.length > limit;
  const rows = result.rows.slice(0, limit);
  if (order === 'DESC') rows.reverse();
  return { messages: rows, has_more };
};

const markMessagesAsRead = async (conversation_id, sender_role) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `UPDATE messages SET is_read = true, read_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE conversation_id = $1 AND sender_role = $2 AND is_read = false
       RETURNING id`,
      [conversation_id, sender_role]
    );
    const conversation = await refreshConversationCounters(client, conversation_id);
    await client.query('COMMIT');
    return { marked: result.rowCount, conversation };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  getOrCreateConversationForUser,
  getConversationById,
  getAllConversations,
  countConversations,
  getAdminUnreadSummary,
  updateConversationStatus,
  createMessage,
  getMessages,
  getMessageById,
  markMessagesAsRead
};
