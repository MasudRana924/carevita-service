const pool = require('../config/database');

const createWithdrawal = async (withdrawalData) => {
  const { provider_id, provider_type, amount, payment_account_id } = withdrawalData;
  const withdrawal_number = `WD${Date.now()}${Math.floor(Math.random() * 1000)}`;

  const query = `
    INSERT INTO withdrawals (withdrawal_number, provider_id, provider_type, amount, payment_account_id)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `;
  const values = [withdrawal_number, provider_id, provider_type, amount, payment_account_id];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const getWithdrawals = async (provider_id, provider_type, filters = {}) => {
  let query = `
    SELECT w.*, ppa.account_type, ppa.account_number, ppa.account_holder_name
    FROM withdrawals w
    LEFT JOIN provider_payment_accounts ppa ON w.payment_account_id = ppa.id
    WHERE w.provider_id = $1 AND w.provider_type = $2
  `;
  const values = [provider_id, provider_type];
  let paramCount = 2;

  if (filters.status) {
    paramCount++;
    query += ` AND w.status = $${paramCount}`;
    values.push(filters.status);
  }

  query += ' ORDER BY w.created_at DESC';

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

const getWithdrawalById = async (id) => {
  const query = `
    SELECT w.*, ppa.account_type, ppa.account_number, ppa.account_holder_name
    FROM withdrawals w
    LEFT JOIN provider_payment_accounts ppa ON w.payment_account_id = ppa.id
    WHERE w.id = $1
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

const updateWithdrawalStatus = async (id, status, additionalData = {}) => {
  const { rejection_reason, processed_by, transaction_id } = additionalData;

  const query = `
    UPDATE withdrawals
    SET status = $1,
        rejection_reason = COALESCE($2, rejection_reason),
        processed_by = COALESCE($3, processed_by),
        transaction_id = COALESCE($4, transaction_id),
        processed_at = CASE WHEN $1 IN ('APPROVED', 'REJECTED', 'COMPLETED', 'FAILED') THEN CURRENT_TIMESTAMP ELSE processed_at END,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $5
    RETURNING *
  `;
  const values = [status, rejection_reason, processed_by, transaction_id, id];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const getAllWithdrawals = async (filters = {}) => {
  let query = `
    SELECT w.*, u.name as provider_name, ppa.account_type
    FROM withdrawals w
    LEFT JOIN users u ON w.provider_id = u.id
    LEFT JOIN provider_payment_accounts ppa ON w.payment_account_id = ppa.id
    WHERE 1=1
  `;
  const values = [];
  let paramCount = 0;

  if (filters.status) {
    paramCount++;
    query += ` AND w.status = $${paramCount}`;
    values.push(filters.status);
  }

  if (filters.provider_type) {
    paramCount++;
    query += ` AND w.provider_type = $${paramCount}`;
    values.push(filters.provider_type);
  }

  query += ' ORDER BY w.created_at DESC';

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
  createWithdrawal,
  getWithdrawals,
  getWithdrawalById,
  updateWithdrawalStatus,
  getAllWithdrawals
};
