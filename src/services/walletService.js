const pool = require('../config/database');
const Wallet = require('../models/Wallet');
const { snapshotPlatformFeeForPaidAmount } = require('../utils/paymentIntegrity');

/**
 * After successful bKash payment:
 * - snapshotted platform fee share → PLATFORM wallet
 * - remainder → CAREGIVER wallet
 * Idempotent per payment_id.
 * Uses booking.platform_fee / total_amount snapshot — not live PLATFORM_FEE_RATE.
 */
const distributePaymentToWallets = async ({
  payment,
  booking,
  caregiverUserId,
  paidAmount,
  trxId = null
}) => {
  const amount = Number(paidAmount);
  if (!(amount > 0)) {
    return { skipped: true, reason: 'invalid_amount' };
  }

  if (await Wallet.hasPaymentCredits(payment.id)) {
    return { skipped: true, reason: 'already_credited' };
  }

  const platformFee = snapshotPlatformFeeForPaidAmount(booking, amount);
  const caregiverEarning = Number((amount - platformFee).toFixed(2));
  if (caregiverEarning < 0) {
    throw new Error('Invalid fee snapshot relative to paid amount');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const platformWallet = await Wallet.getOrCreateWallet(client, {
      ownerType: 'PLATFORM'
    });
    const caregiverWallet = await Wallet.getOrCreateWallet(client, {
      userId: caregiverUserId,
      ownerType: 'CAREGIVER'
    });

    await Wallet.getOrCreateWallet(client, {
      userId: booking.user_id,
      ownerType: 'USER'
    });

    // Lock wallets to serialize concurrent credits/debits
    await client.query(`SELECT id FROM wallets WHERE id = $1 FOR UPDATE`, [platformWallet.id]);
    await client.query(`SELECT id FROM wallets WHERE id = $1 FOR UPDATE`, [caregiverWallet.id]);

    if (await Wallet.hasPaymentCredits(payment.id, client)) {
      await client.query('ROLLBACK');
      return { skipped: true, reason: 'already_credited' };
    }

    const platformCredit = await Wallet.credit(client, {
      walletId: platformWallet.id,
      userId: null,
      bookingId: booking.id,
      paymentId: payment.id,
      amount: platformFee,
      category: 'PLATFORM_FEE',
      description: `Platform fee from booking ${booking.booking_number}`,
      meta: {
        booking_number: booking.booking_number,
        trx_id: trxId,
        snapshotted_platform_fee: Number(booking.platform_fee),
        snapshotted_total: Number(booking.total_amount),
        paid_amount: amount
      }
    });

    const caregiverCredit = await Wallet.credit(client, {
      walletId: caregiverWallet.id,
      userId: caregiverUserId,
      bookingId: booking.id,
      paymentId: payment.id,
      amount: caregiverEarning,
      category: 'CAREGIVER_EARNING',
      description: `Earning from booking ${booking.booking_number}`,
      meta: {
        booking_number: booking.booking_number,
        trx_id: trxId,
        paid_amount: amount
      }
    });

    await client.query('COMMIT');

    return {
      skipped: false,
      platform_fee: platformFee,
      caregiver_earning: caregiverEarning,
      paid_amount: amount,
      platform_wallet: platformCredit.wallet,
      caregiver_wallet: caregiverCredit.wallet
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

const getCaregiverEarningForBooking = async (bookingId) => {
  const result = await pool.query(
    `
    SELECT amount, meta
    FROM wallet_transactions
    WHERE booking_id = $1
      AND category = 'CAREGIVER_EARNING'
      AND direction = 'CREDIT'
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [bookingId]
  );
  if (!result.rows[0]) return null;
  return Number(result.rows[0].amount) || 0;
};

const reversePaymentWallets = async ({ payment, booking, amount }) => {
  const refundAmount = Number(amount);
  if (!(refundAmount > 0)) return { skipped: true, reason: 'invalid_amount' };

  const credits = await pool.query(
    `
    SELECT * FROM wallet_transactions
    WHERE payment_id = $1 AND direction = 'CREDIT'
      AND category IN ('PLATFORM_FEE', 'CAREGIVER_EARNING')
    `,
    [payment.id]
  );

  if (!credits.rows.length) {
    return { skipped: true, reason: 'no_credits' };
  }

  const already = await pool.query(
    `
    SELECT COALESCE(SUM(amount), 0)::float AS total
    FROM wallet_transactions
    WHERE payment_id = $1 AND direction = 'DEBIT' AND category = 'PAYMENT_REFUND'
    `,
    [payment.id]
  );
  const alreadyDebited = Number(already.rows[0].total || 0);
  const paidAmount = credits.rows.reduce((sum, row) => sum + Number(row.amount), 0);
  const remainingCredit = Number((paidAmount - alreadyDebited).toFixed(2));
  if (remainingCredit <= 0) {
    return { skipped: true, reason: 'already_reversed' };
  }

  const slice = Math.min(refundAmount, remainingCredit);
  const ratio = paidAmount > 0 ? slice / paidAmount : 1;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const reversed = [];

    for (const row of credits.rows) {
      await client.query(`SELECT id FROM wallets WHERE id = $1 FOR UPDATE`, [row.wallet_id]);
      const debitAmount = Number((Number(row.amount) * ratio).toFixed(2));
      if (!(debitAmount > 0)) continue;
      const result = await Wallet.debit(client, {
        walletId: row.wallet_id,
        userId: row.user_id,
        bookingId: booking.id,
        paymentId: payment.id,
        amount: debitAmount,
        category: 'PAYMENT_REFUND',
        description: `Refund reverse for booking ${booking.booking_number}`,
        meta: { original_category: row.category, refund_amount: refundAmount }
      });
      reversed.push({ category: row.category, amount: debitAmount, wallet: result.wallet });
    }

    await client.query('COMMIT');
    return { skipped: false, reversed };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

module.exports = {
  distributePaymentToWallets,
  getCaregiverEarningForBooking,
  reversePaymentWallets
};
