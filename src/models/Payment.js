const pool = require('../config/database');

const createPayment = async (paymentData) => {
  const {
    booking_id, user_id, amount, payment_method, transaction_id,
    payment_gateway, gateway_response
  } = paymentData;

  const query = `
    INSERT INTO payments (
      booking_id, user_id, amount, payment_method, transaction_id,
      payment_gateway, gateway_response
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `;
  const values = [
    booking_id, user_id, amount, payment_method, transaction_id,
    payment_gateway, gateway_response
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const findById = async (id) => {
  const query = 'SELECT * FROM payments WHERE id = $1';
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

const findByBookingId = async (booking_id) => {
  const query = 'SELECT * FROM payments WHERE booking_id = $1 ORDER BY created_at DESC';
  const result = await pool.query(query, [booking_id]);
  return result.rows;
};

const findByUserId = async (user_id, filters = {}) => {
  let query = 'SELECT * FROM payments WHERE user_id = $1';
  const values = [user_id];
  let paramCount = 1;

  if (filters.status) {
    paramCount++;
    query += ` AND status = $${paramCount}`;
    values.push(filters.status);
  }

  if (filters.payment_method) {
    paramCount++;
    query += ` AND payment_method = $${paramCount}`;
    values.push(filters.payment_method);
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

const updateStatus = async (id, status, gateway_response = null) => {
  const query = `
    UPDATE payments 
    SET status = $1, gateway_response = $2, updated_at = CURRENT_TIMESTAMP
    WHERE id = $3
    RETURNING *
  `;
  const result = await pool.query(query, [status, gateway_response, id]);
  return result.rows[0];
};

const refund = async (id, refunded_amount, refund_reason) => {
  const query = `
    UPDATE payments 
    SET status = 'refunded', refunded_amount = $1, refund_reason = $2,
        refunded_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE id = $3
    RETURNING *
  `;
  const result = await pool.query(query, [refunded_amount, refund_reason, id]);
  return result.rows[0];
};

const findAll = async (filters = {}) => {
  let query = 'SELECT * FROM payments WHERE 1=1';
  const values = [];
  let paramCount = 0;

  if (filters.status) {
    paramCount++;
    query += ` AND status = $${paramCount}`;
    values.push(filters.status);
  }

  if (filters.payment_method) {
    paramCount++;
    query += ` AND payment_method = $${paramCount}`;
    values.push(filters.payment_method);
  }

  if (filters.date_from) {
    paramCount++;
    query += ` AND created_at >= $${paramCount}`;
    values.push(filters.date_from);
  }

  if (filters.date_to) {
    paramCount++;
    query += ` AND created_at <= $${paramCount}`;
    values.push(filters.date_to);
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

module.exports = {
  createPayment,
  findById,
  findByBookingId,
  findByUserId,
  updateStatus,
  refund,
  findAll
};
