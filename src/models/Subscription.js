const pool = require('../config/database');

const createSubscription = async (subscriptionData) => {
  const {
    user_id, plan_name, plan_type, amount, currency,
    start_date, end_date, features, auto_renew
  } = subscriptionData;

  const query = `
    INSERT INTO subscriptions (
      user_id, plan_name, plan_type, amount, currency,
      start_date, end_date, features, auto_renew
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *
  `;
  const values = [
    user_id, plan_name, plan_type, amount, currency,
    start_date, end_date, features, auto_renew
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const findSubscriptionById = async (id) => {
  const query = `
    SELECT s.*, u.name as user_name, u.phone as user_phone
    FROM subscriptions s
    JOIN users u ON s.user_id = u.id
    WHERE s.id = $1
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

const findSubscriptionsByUserId = async (user_id, filters = {}) => {
  let query = `
    SELECT * FROM subscriptions 
    WHERE user_id = $1
  `;
  const values = [user_id];
  let paramCount = 1;

  if (filters.status) {
    paramCount++;
    query += ` AND status = $${paramCount}`;
    values.push(filters.status);
  }

  query += ' ORDER BY created_at DESC';

  if (filters.limit) {
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    values.push(filters.limit);
  }

  const result = await pool.query(query, values);
  return result.rows;
};

const getActiveSubscription = async (user_id) => {
  const query = `
    SELECT * FROM subscriptions 
    WHERE user_id = $1 
    AND status = 'active'
    AND end_date >= CURRENT_DATE
    ORDER BY end_date DESC
    LIMIT 1
  `;
  const result = await pool.query(query, [user_id]);
  return result.rows[0];
};

const updateSubscription = async (id, subscriptionData) => {
  const { plan_name, plan_type, amount, features, auto_renew } = subscriptionData;

  const query = `
    UPDATE subscriptions 
    SET plan_name = $1, plan_type = $2, amount = $3, features = $4,
        auto_renew = $5, updated_at = CURRENT_TIMESTAMP
    WHERE id = $6
    RETURNING *
  `;
  const values = [plan_name, plan_type, amount, features, auto_renew, id];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const cancelSubscription = async (id) => {
  const query = `
    UPDATE subscriptions 
    SET status = 'cancelled', auto_renew = false, cancelled_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING *
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

const renewSubscription = async (id, new_end_date) => {
  const query = `
    UPDATE subscriptions 
    SET end_date = $1, status = 'active', cancelled_at = NULL,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING *
  `;
  const result = await pool.query(query, [new_end_date, id]);
  return result.rows[0];
};

const findAllSubscriptions = async (filters = {}) => {
  let query = `
    SELECT s.*, u.name as user_name, u.phone as user_phone
    FROM subscriptions s
    JOIN users u ON s.user_id = u.id
    WHERE 1=1
  `;
  const values = [];
  let paramCount = 0;

  if (filters.status) {
    paramCount++;
    query += ` AND s.status = $${paramCount}`;
    values.push(filters.status);
  }

  if (filters.plan_type) {
    paramCount++;
    query += ` AND s.plan_type = $${paramCount}`;
    values.push(filters.plan_type);
  }

  query += ' ORDER BY s.created_at DESC';

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

const getExpiringSubscriptions = async (days = 7) => {
  const query = `
    SELECT s.*, u.name as user_name, u.phone as user_phone
    FROM subscriptions s
    JOIN users u ON s.user_id = u.id
    WHERE s.status = 'active'
    AND s.end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '${days} days'
    ORDER BY s.end_date ASC
  `;
  const result = await pool.query(query);
  return result.rows;
};

module.exports = {
  createSubscription,
  findSubscriptionById,
  findSubscriptionsByUserId,
  getActiveSubscription,
  updateSubscription,
  cancelSubscription,
  renewSubscription,
  findAllSubscriptions,
  getExpiringSubscriptions
};
