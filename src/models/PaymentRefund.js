const pool = require('../config/database');

const MAX_REFUNDS = 10;

const createRefund = async ({
  paymentId,
  bookingId,
  refundAmount,
  sku,
  reason,
  originalTrxId,
  status = 'PENDING',
  response = {}
}) => {
  const result = await pool.query(
    `
    INSERT INTO payment_refunds (
      payment_id, booking_id, refund_amount, sku, reason,
      original_trx_id, status, response
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
    `,
    [
      paymentId,
      bookingId,
      refundAmount,
      sku,
      reason,
      originalTrxId || null,
      status,
      JSON.stringify(response || {})
    ]
  );
  return result.rows[0];
};

const markRefundRow = async (id, { status, refundTrxId, response = {} }) => {
  const result = await pool.query(
    `
    UPDATE payment_refunds
    SET status = $1,
        refund_trx_id = COALESCE($2, refund_trx_id),
        response = $3::jsonb,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $4
    RETURNING *
    `,
    [status, refundTrxId || null, JSON.stringify(response || {}), id]
  );
  return result.rows[0];
};

const listByPaymentId = async (paymentId) => {
  const result = await pool.query(
    `
    SELECT * FROM payment_refunds
    WHERE payment_id = $1
    ORDER BY created_at ASC
    `,
    [paymentId]
  );
  return result.rows;
};

const completedAmount = async (paymentId) => {
  const result = await pool.query(
    `
    SELECT COALESCE(SUM(refund_amount), 0)::float AS total,
           COUNT(*) FILTER (WHERE status IN ('COMPLETED', 'PENDING'))::int AS attempts
    FROM payment_refunds
    WHERE payment_id = $1
    `,
    [paymentId]
  );
  return {
    total: Number(result.rows[0].total || 0),
    attempts: Number(result.rows[0].attempts || 0)
  };
};

module.exports = {
  MAX_REFUNDS,
  createRefund,
  markRefundRow,
  listByPaymentId,
  completedAmount
};
