const pool = require('../config/database');

const getOrCreateWallet = async (client, { userId = null, ownerType }) => {
  const db = client || pool;

  if (ownerType === 'PLATFORM') {
    const existing = await db.query(
      `SELECT * FROM wallets WHERE owner_type = 'PLATFORM' LIMIT 1`
    );
    if (existing.rows[0]) return existing.rows[0];

    const created = await db.query(
      `
      INSERT INTO wallets (owner_type, balance)
      VALUES ('PLATFORM', 0)
      RETURNING *
      `
    );
    return created.rows[0];
  }

  const existing = await db.query(
    `SELECT * FROM wallets WHERE user_id = $1`,
    [userId]
  );
  if (existing.rows[0]) return existing.rows[0];

  const created = await db.query(
    `
    INSERT INTO wallets (user_id, owner_type, balance)
    VALUES ($1, $2, 0)
    ON CONFLICT (user_id) DO UPDATE SET updated_at = CURRENT_TIMESTAMP
    RETURNING *
    `,
    [userId, ownerType]
  );
  return created.rows[0];
};

const findByUserId = async (userId) => {
  const result = await pool.query(
    `SELECT * FROM wallets WHERE user_id = $1`,
    [userId]
  );
  return result.rows[0] || null;
};

const getPlatformWallet = async () => getOrCreateWallet(null, { ownerType: 'PLATFORM' });

const credit = async (client, {
  walletId,
  userId = null,
  bookingId = null,
  paymentId = null,
  amount,
  category,
  description = null,
  meta = {}
}) => {
  return mutateBalance(client, {
    walletId,
    userId,
    bookingId,
    paymentId,
    amount,
    direction: 'CREDIT',
    category,
    description,
    meta
  });
};

const debit = async (client, {
  walletId,
  userId = null,
  bookingId = null,
  paymentId = null,
  amount,
  category,
  description = null,
  meta = {}
}) => {
  return mutateBalance(client, {
    walletId,
    userId,
    bookingId,
    paymentId,
    amount,
    direction: 'DEBIT',
    category,
    description,
    meta
  });
};

const mutateBalance = async (client, {
  walletId,
  userId = null,
  bookingId = null,
  paymentId = null,
  amount,
  direction,
  category,
  description = null,
  meta = {}
}) => {
  const db = client || pool;
  const amt = Number(amount);
  if (!(amt > 0)) {
    throw new Error(`${direction} amount must be > 0`);
  }

  const operator = direction === 'DEBIT' ? '-' : '+';
  const updated = await db.query(
    `
    UPDATE wallets
    SET balance = balance ${operator} $1,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
      AND ($3::text = 'CREDIT' OR balance >= $1)
    RETURNING *
    `,
    [amt, walletId, direction]
  );
  const wallet = updated.rows[0];
  if (!wallet) {
    throw new Error(direction === 'DEBIT' ? 'Insufficient wallet balance' : 'Wallet not found');
  }

  const tx = await db.query(
    `
    INSERT INTO wallet_transactions (
      wallet_id, user_id, booking_id, payment_id,
      amount, direction, category, description, balance_after, meta
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *
    `,
    [
      walletId,
      userId,
      bookingId,
      paymentId,
      amt,
      direction,
      category,
      description,
      wallet.balance,
      JSON.stringify(meta || {})
    ]
  );

  return { wallet, transaction: tx.rows[0] };
};

const hasPaymentCredits = async (paymentId, client = null) => {
  const db = client || pool;
  const result = await db.query(
    `SELECT 1 FROM wallet_transactions WHERE payment_id = $1 LIMIT 1`,
    [paymentId]
  );
  return result.rowCount > 0;
};

const listTransactions = async (walletId, { limit = 20, offset = 0 } = {}) => {
  const result = await pool.query(
    `
    SELECT *
    FROM wallet_transactions
    WHERE wallet_id = $1
    ORDER BY created_at DESC
    LIMIT $2 OFFSET $3
    `,
    [walletId, limit, offset]
  );
  return result.rows;
};

module.exports = {
  getOrCreateWallet,
  findByUserId,
  getPlatformWallet,
  credit,
  debit,
  hasPaymentCredits,
  listTransactions
};
