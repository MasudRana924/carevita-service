const pool = require('../config/database');

const createPaymentAccount = async (accountData) => {
  const { provider_id, provider_type, account_type, account_number, account_holder_name, bank_name, routing_number } = accountData;

  const query = `
    INSERT INTO provider_payment_accounts (provider_id, provider_type, account_type, account_number, account_holder_name, bank_name, routing_number)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `;
  const values = [provider_id, provider_type, account_type, account_number, account_holder_name, bank_name, routing_number];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const getPaymentAccounts = async (provider_id, provider_type) => {
  const query = `
    SELECT * FROM provider_payment_accounts
    WHERE provider_id = $1 AND provider_type = $2
    ORDER BY is_default DESC, created_at DESC
  `;
  const result = await pool.query(query, [provider_id, provider_type]);
  return result.rows;
};

const updatePaymentAccount = async (id, accountData) => {
  const { account_holder_name, bank_name, routing_number, is_default } = accountData;

  const query = `
    UPDATE provider_payment_accounts
    SET account_holder_name = COALESCE($1, account_holder_name),
        bank_name = COALESCE($2, bank_name),
        routing_number = COALESCE($3, routing_number),
        is_default = COALESCE($4, is_default),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $5
    RETURNING *
  `;
  const values = [account_holder_name, bank_name, routing_number, is_default, id];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const deletePaymentAccount = async (id) => {
  const query = `
    DELETE FROM provider_payment_accounts
    WHERE id = $1
    RETURNING *
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

const setDefaultAccount = async (id, provider_id, provider_type) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Remove default from all accounts
    await client.query(
      'UPDATE provider_payment_accounts SET is_default = false WHERE provider_id = $1 AND provider_type = $2',
      [provider_id, provider_type]
    );
    
    // Set new default
    const result = await client.query(
      'UPDATE provider_payment_accounts SET is_default = true, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
      [id]
    );
    
    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const maskAccountNumber = (accountNumber) => {
  if (!accountNumber) return null;
  if (accountNumber.length <= 4) return accountNumber;
  return accountNumber.substring(0, 2) + '******' + accountNumber.substring(accountNumber.length - 2);
};

module.exports = {
  createPaymentAccount,
  getPaymentAccounts,
  updatePaymentAccount,
  deletePaymentAccount,
  setDefaultAccount,
  maskAccountNumber
};
