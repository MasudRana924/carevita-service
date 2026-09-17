const pool = require('../config/database');

const createPayment = async ({
  user_id,
  booking_id,
  amount,
  currency = 'BDT',
  merchant_invoice,
  bkash_payment_id = null,
  status = 'CREATED',
  create_response = {},
  idempotency_key = null
}) => {
  const result = await pool.query(
    `
    INSERT INTO payments (
      user_id, booking_id, amount, currency, merchant_invoice,
      bkash_payment_id, status, create_response, payment_method, idempotency_key
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'BKASH', $9)
    RETURNING *
    `,
    [
      user_id,
      booking_id,
      amount,
      currency,
      merchant_invoice,
      bkash_payment_id,
      status,
      JSON.stringify(create_response || {}),
      idempotency_key
    ]
  );
  return result.rows[0];
};

const findByIdempotencyKey = async (key) => {
  if (!key) return null;
  const result = await pool.query(
    'SELECT * FROM payments WHERE idempotency_key = $1 LIMIT 1',
    [key]
  );
  return result.rows[0] || null;
};

const findByBkashPaymentId = async (bkashPaymentId) => {
  const result = await pool.query(
    'SELECT * FROM payments WHERE bkash_payment_id = $1 ORDER BY created_at DESC LIMIT 1',
    [bkashPaymentId]
  );
  return result.rows[0] || null;
};

const findById = async (id) => {
  const result = await pool.query('SELECT * FROM payments WHERE id = $1', [id]);
  return result.rows[0] || null;
};

const findByBookingId = async (bookingId) => {
  const result = await pool.query(
    'SELECT * FROM payments WHERE booking_id = $1 ORDER BY created_at DESC',
    [bookingId]
  );
  return result.rows;
};

const markExecuted = async (id, {
  status,
  trx_id = null,
  execute_response = {},
  bkash_payment_id = null
}) => {
  // paid_at is set in JS so $1 is not reused as both VARCHAR and a CASE operand
  // (PostgreSQL: "inconsistent types deduced for parameter $1")
  const paidAt = status === 'COMPLETED' ? new Date() : null;
  const result = await pool.query(
    `
    UPDATE payments
    SET status = $1,
        trx_id = COALESCE($2, trx_id),
        execute_response = $3::jsonb,
        bkash_payment_id = COALESCE($4, bkash_payment_id),
        paid_at = COALESCE($6, paid_at),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $5
    RETURNING *
    `,
    [status, trx_id, JSON.stringify(execute_response || {}), bkash_payment_id, id, paidAt]
  );
  return result.rows[0];
};

const markRefunded = async (id, { refunded_amount, refund_response = {} }) => {
  const result = await pool.query(
    `
    UPDATE payments
    SET refunded_amount = COALESCE(refunded_amount, 0) + $1,
        refund_response = $2::jsonb,
        refunded_at = CURRENT_TIMESTAMP,
        status = CASE
          WHEN COALESCE(refunded_amount, 0) + $1 >= amount THEN 'REFUNDED'
          ELSE 'PARTIAL_REFUND'
        END,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $3
    RETURNING *
    `,
    [refunded_amount, JSON.stringify(refund_response || {}), id]
  );
  return result.rows[0];
};

const saveQueryResponse = async (id, query_response = {}) => {
  const result = await pool.query(
    `
    UPDATE payments
    SET query_response = $1::jsonb, updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING *
    `,
    [JSON.stringify(query_response || {}), id]
  );
  return result.rows[0];
};

module.exports = {
  createPayment,
  findByBkashPaymentId,
  findByIdempotencyKey,
  findById,
  findByBookingId,
  markExecuted,
  markRefunded,
  saveQueryResponse
};
