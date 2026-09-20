const pool = require('../../config/database');

const settleEarning = async (id) => {
  const result = await pool.query(
    `
    UPDATE bookings
    SET earning_settled_at = COALESCE(earning_settled_at, CURRENT_TIMESTAMP),
        payout_status = 'SETTLED_TO_WALLET',
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING *
    `,
    [id]
  );
  return result.rows[0];
};

module.exports = { settleEarning };
