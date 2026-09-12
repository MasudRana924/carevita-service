const pool = require('../config/database');

const createPayment = async ({
  user_id,
  booking_id,
  amount,
  currency = 'BDT',
  merchant_invoice,
  bkash_payment_id = null,
  status = 'CREATED',
  create_response = {}
}) => {
  const result = await pool.query(
    `
    INSERT INTO payments (
      user_id, booking_id, amount, currency, merchant_invoice,
      bkash_payment_id, status, create_response, payment_method
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'BKASH')
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
      JSON.stringify(create_response || {})
    ]
  );
  return result.rows[0];
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
  const result = await pool.query(
    `
    UPDATE payments
    SET status = $1,
        trx_id = COALESCE($2, trx_id),
        execute_response = $3,
        bkash_payment_id = COALESCE($4, bkash_payment_id),
        paid_at = CASE WHEN $1 = 'COMPLETED' THEN CURRENT_TIMESTAMP ELSE paid_at END,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $5
    RETURNING *
    `,
    [status, trx_id, JSON.stringify(execute_response || {}), bkash_payment_id, id]
  );
  return result.rows[0];
};

module.exports = {
  createPayment,
  findByBkashPaymentId,
  findById,
  findByBookingId,
  markExecuted
};
