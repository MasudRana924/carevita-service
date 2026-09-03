const pool = require('../config/database');

const createNotification = async (notificationData) => {
  const {
    user_id, title, message, type, reference_id, reference_type
  } = notificationData;

  const query = `
    INSERT INTO notifications (
      user_id, title, message, type, reference_id, reference_type
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `;
  const values = [user_id, title, message, type, reference_id, reference_type];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const findNotificationById = async (id) => {
  const query = 'SELECT * FROM notifications WHERE id = $1';
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

const findNotificationsByUserId = async (user_id, filters = {}) => {
  let query = 'SELECT * FROM notifications WHERE user_id = $1';
  const values = [user_id];
  let paramCount = 1;

  if (filters.is_read !== undefined) {
    paramCount++;
    query += ` AND is_read = $${paramCount}`;
    values.push(filters.is_read);
  }

  if (filters.type) {
    paramCount++;
    query += ` AND type = $${paramCount}`;
    values.push(filters.type);
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

const markNotificationAsRead = async (id) => {
  const query = `
    UPDATE notifications 
    SET is_read = true
    WHERE id = $1
    RETURNING *
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

const markAllNotificationsAsRead = async (user_id) => {
  const query = `
    UPDATE notifications 
    SET is_read = true
    WHERE user_id = $1 AND is_read = false
    RETURNING *
  `;
  const result = await pool.query(query, [user_id]);
  return result.rows;
};

const updateNotificationDeliveryStatus = async (id, deliveryData) => {
  const { sent_via_sms, sent_via_email, sent_via_push } = deliveryData;

  const query = `
    UPDATE notifications 
    SET sent_via_sms = COALESCE($1, sent_via_sms),
        sent_via_email = COALESCE($2, sent_via_email),
        sent_via_push = COALESCE($3, sent_via_push)
    WHERE id = $4
    RETURNING *
  `;
  const result = await pool.query(query, [sent_via_sms, sent_via_email, sent_via_push, id]);
  return result.rows[0];
};

const deleteNotification = async (id) => {
  const query = 'DELETE FROM notifications WHERE id = $1 RETURNING *';
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

const getUnreadNotificationCount = async (user_id) => {
  const query = 'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = false';
  const result = await pool.query(query, [user_id]);
  return parseInt(result.rows[0].count);
};

const deleteOldNotifications = async (daysOld = 30) => {
  const query = `
    DELETE FROM notifications 
    WHERE created_at < NOW() - INTERVAL '${daysOld} days'
    RETURNING *
  `;
  const result = await pool.query(query);
  return result.rows;
};

module.exports = {
  createNotification,
  findNotificationById,
  findNotificationsByUserId,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  updateNotificationDeliveryStatus,
  deleteNotification,
  getUnreadNotificationCount,
  deleteOldNotifications
};
