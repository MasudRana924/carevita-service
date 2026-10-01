const pool = require('../config/database');

const MESSAGE_COLUMNS = `
  m.id, m.booking_id, m.sender_id, m.sender_role, m.message_type, m.message,
  m.attachment_url, m.attachment_name, m.attachment_mime, m.attachment_size,
  m.client_message_id, m.is_read, m.read_at, m.created_at,
  u.name AS sender_name, u.profile_photo AS sender_photo
`;

const getMessageById = async (id) => {
  const result = await pool.query(
    `SELECT ${MESSAGE_COLUMNS} FROM booking_chat_messages m LEFT JOIN users u ON u.id = m.sender_id WHERE m.id = $1`,
    [id]
  );
  return result.rows[0] || null;
};

/** Returns { message, duplicate }. A repeated client_message_id returns the original row. */
const createMessage = async ({
  booking_id,
  sender_id,
  sender_role,
  message_type = 'text',
  message = null,
  attachment = null,
  client_message_id = null
}) => {
  const inserted = await pool.query(
    `INSERT INTO booking_chat_messages (
       booking_id, sender_id, sender_role, message_type, message,
       attachment_url, attachment_name, attachment_mime, attachment_size, attachment_public_id,
       client_message_id
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     ON CONFLICT (booking_id, client_message_id) WHERE client_message_id IS NOT NULL DO NOTHING
     RETURNING id`,
    [
      booking_id,
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

  if (inserted.rows[0]) {
    return { message: await getMessageById(inserted.rows[0].id), duplicate: false };
  }

  const existing = await pool.query(
    'SELECT id FROM booking_chat_messages WHERE booking_id = $1 AND client_message_id = $2',
    [booking_id, client_message_id]
  );
  return { message: await getMessageById(existing.rows[0].id), duplicate: true };
};

/**
 * Cursor pagination, always returned oldest -> newest.
 * - no cursor: latest `limit` messages
 * - before=<messageId>: older history
 * - after=<messageId>: messages newer than the client's latest
 */
const getMessages = async (booking_id, { before, after, limit = 30 } = {}) => {
  const values = [booking_id];
  let cursorClause = '';
  let order = 'DESC';

  const cursorId = before || after;
  if (cursorId) {
    const cursor = await pool.query(
      'SELECT 1 FROM booking_chat_messages WHERE id = $1 AND booking_id = $2',
      [cursorId, booking_id]
    );
    if (!cursor.rows[0]) {
      const err = new Error('Invalid message cursor');
      err.statusCode = 400;
      throw err;
    }
    // Compare in SQL: JS Date would drop Postgres microseconds and break the cursor.
    values.push(cursorId);
    const cursorRow = '(SELECT c.created_at, c.id FROM booking_chat_messages c WHERE c.id = $2)';
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
     FROM booking_chat_messages m
     LEFT JOIN users u ON u.id = m.sender_id
     WHERE m.booking_id = $1 ${cursorClause}
     ORDER BY m.created_at ${order}, m.id ${order}
     LIMIT $${values.length}`,
    values
  );

  const has_more = result.rows.length > limit;
  const rows = result.rows.slice(0, limit);
  if (order === 'DESC') rows.reverse();
  return { messages: rows, has_more };
};

/** Marks messages sent by `sender_role` as read. Returns the number of rows updated. */
const markRead = async (booking_id, sender_role) => {
  const result = await pool.query(
    `UPDATE booking_chat_messages SET is_read = true, read_at = CURRENT_TIMESTAMP
     WHERE booking_id = $1 AND sender_role = $2 AND is_read = false`,
    [booking_id, sender_role]
  );
  return result.rowCount;
};

const countUnread = async (booking_id, sender_role) => {
  const result = await pool.query(
    `SELECT COUNT(*)::int AS count FROM booking_chat_messages
     WHERE booking_id = $1 AND sender_role = $2 AND is_read = false`,
    [booking_id, sender_role]
  );
  return result.rows[0].count;
};

const getLastMessage = async (booking_id) => {
  const result = await pool.query(
    `SELECT ${MESSAGE_COLUMNS}
     FROM booking_chat_messages m
     LEFT JOIN users u ON u.id = m.sender_id
     WHERE m.booking_id = $1
     ORDER BY m.created_at DESC, m.id DESC
     LIMIT 1`,
    [booking_id]
  );
  return result.rows[0] || null;
};

/** Hard-deletes the thread. Returns the Cloudinary public ids of deleted attachments. */
const deleteByBookingId = async (booking_id) => {
  const result = await pool.query(
    'DELETE FROM booking_chat_messages WHERE booking_id = $1 RETURNING attachment_public_id, attachment_mime',
    [booking_id]
  );
  return result.rows.filter((row) => row.attachment_public_id);
};

/** Booking ids that still hold chat rows although the service is no longer in progress. */
const findStaleBookingIds = async (limit = 50) => {
  const result = await pool.query(
    `SELECT DISTINCT m.booking_id
     FROM booking_chat_messages m
     JOIN bookings b ON b.id = m.booking_id
     WHERE b.status <> 'SERVICE_IN_PROGRESS'
     LIMIT $1`,
    [limit]
  );
  return result.rows.map((row) => row.booking_id);
};

module.exports = {
  getMessageById,
  createMessage,
  getMessages,
  markRead,
  countUnread,
  getLastMessage,
  deleteByBookingId,
  findStaleBookingIds
};
