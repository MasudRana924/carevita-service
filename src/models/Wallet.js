const pool = require('../config/database');

const createCustomerWallet = async (user_id) => {
  const query = `
    INSERT INTO customer_wallets (user_id)
    VALUES ($1)
    ON CONFLICT (user_id) DO NOTHING
    RETURNING *
  `;
  const result = await pool.query(query, [user_id]);
  return result.rows[0];
};

const createProviderWallet = async (provider_id, provider_type) => {
  const query = `
    INSERT INTO provider_wallets (provider_id, provider_type)
    VALUES ($1, $2)
    ON CONFLICT DO NOTHING
    RETURNING *
  `;
  const result = await pool.query(query, [provider_id, provider_type]);
  return result.rows[0];
};

const getCustomerWallet = async (user_id) => {
  const query = 'SELECT * FROM customer_wallets WHERE user_id = $1';
  const result = await pool.query(query, [user_id]);
  return result.rows[0];
};

const getProviderWallet = async (provider_id, provider_type) => {
  const query = 'SELECT * FROM provider_wallets WHERE provider_id = $1 AND provider_type = $2';
  const result = await pool.query(query, [provider_id, provider_type]);
  return result.rows[0];
};

const updateCustomerBalance = async (user_id, amount, type) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const walletQuery = 'SELECT * FROM customer_wallets WHERE user_id = $1 FOR UPDATE';
    const walletResult = await client.query(walletQuery, [user_id]);
    let wallet = walletResult.rows[0];

    if (!wallet) {
      const createQuery = 'INSERT INTO customer_wallets (user_id) VALUES ($1) RETURNING *';
      const createResult = await client.query(createQuery, [user_id]);
      wallet = createResult.rows[0];
    }

    let newBalance = wallet.balance;
    let newCredits = wallet.credits;
    let newPromotionalCredits = wallet.promotional_credits;

    if (type === 'credit') {
      newBalance = parseFloat(wallet.balance) + parseFloat(amount);
    } else if (type === 'debit') {
      newBalance = parseFloat(wallet.balance) - parseFloat(amount);
    } else if (type === 'credit_add') {
      newCredits = parseFloat(wallet.credits) + parseFloat(amount);
    } else if (type === 'credit_use') {
      newCredits = parseFloat(wallet.credits) - parseFloat(amount);
    } else if (type === 'promotional_add') {
      newPromotionalCredits = parseFloat(wallet.promotional_credits) + parseFloat(amount);
    } else if (type === 'promotional_use') {
      newPromotionalCredits = parseFloat(wallet.promotional_credits) - parseFloat(amount);
    }

    const updateQuery = `
      UPDATE customer_wallets 
      SET balance = $1, credits = $2, promotional_credits = $3, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $4
      RETURNING *
    `;
    const updateResult = await client.query(updateQuery, [newBalance, newCredits, newPromotionalCredits, user_id]);
    wallet = updateResult.rows[0];

    await client.query('COMMIT');
    return wallet;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const updateProviderEarnings = async (provider_id, provider_type, amount, type) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const walletQuery = 'SELECT * FROM provider_wallets WHERE provider_id = $1 AND provider_type = $2 FOR UPDATE';
    const walletResult = await client.query(walletQuery, [provider_id, provider_type]);
    let wallet = walletResult.rows[0];

    if (!wallet) {
      const createQuery = 'INSERT INTO provider_wallets (provider_id, provider_type) VALUES ($1, $2) RETURNING *';
      const createResult = await client.query(createQuery, [provider_id, provider_type]);
      wallet = createResult.rows[0];
    }

    let newTotalEarnings = parseFloat(wallet.total_earnings);
    let newPendingPayout = parseFloat(wallet.pending_payout);
    let newCompletedPayout = parseFloat(wallet.completed_payout);
    let newPlatformCommission = parseFloat(wallet.platform_commission);

    if (type === 'earn') {
      newTotalEarnings += parseFloat(amount);
      newPendingPayout += parseFloat(amount);
    } else if (type === 'payout') {
      newPendingPayout -= parseFloat(amount);
      newCompletedPayout += parseFloat(amount);
    } else if (type === 'commission') {
      newPlatformCommission += parseFloat(amount);
    }

    const updateQuery = `
      UPDATE provider_wallets 
      SET total_earnings = $1, pending_payout = $2, completed_payout = $3,
          platform_commission = $4, updated_at = CURRENT_TIMESTAMP
      WHERE provider_id = $5 AND provider_type = $6
      RETURNING *
    `;
    const updateResult = await client.query(updateQuery, [
      newTotalEarnings, newPendingPayout, newCompletedPayout,
      newPlatformCommission, provider_id, provider_type
    ]);
    wallet = updateResult.rows[0];

    await client.query('COMMIT');
    return wallet;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const addTransaction = async (wallet_id, wallet_type, transactionData) => {
  const { type, amount, description, reference_id, balance_after } = transactionData;

  const query = `
    INSERT INTO wallet_transactions (wallet_id, wallet_type, type, amount, description, reference_id, balance_after)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `;
  const values = [wallet_id, wallet_type, type, amount, description, reference_id, balance_after];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const getTransactions = async (wallet_id, wallet_type, filters = {}) => {
  let query = 'SELECT * FROM wallet_transactions WHERE wallet_id = $1 AND wallet_type = $2';
  const values = [wallet_id, wallet_type];
  let paramCount = 2;

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

module.exports = {
  createCustomerWallet,
  createProviderWallet,
  getCustomerWallet,
  getProviderWallet,
  updateCustomerBalance,
  updateProviderEarnings,
  addTransaction,
  getTransactions
};
