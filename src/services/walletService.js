const pool = require('../config/database');
const Wallet = require('../models/Wallet');
const { PLATFORM_FEE_RATE } = require('../config/platform');

/**
 * After successful bKash payment:
 * - 5% → PLATFORM wallet (CareMate service fee)
 * - 95% → CAREGIVER wallet
 * Idempotent per payment_id.
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

  const platformFee = Number((amount * PLATFORM_FEE_RATE).toFixed(2));
  const caregiverEarning = Number((amount - platformFee).toFixed(2));

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

    // Ensure user (customer) also has a wallet row (balance unchanged on pay)
    await Wallet.getOrCreateWallet(client, {
      userId: booking.user_id,
      ownerType: 'USER'
    });

    const platformCredit = await Wallet.credit(client, {
      walletId: platformWallet.id,
      userId: null,
      bookingId: booking.id,
      paymentId: payment.id,
      amount: platformFee,
      category: 'PLATFORM_FEE',
      description: `${Math.round(PLATFORM_FEE_RATE * 100)}% service fee from booking ${booking.booking_number}`,
      meta: {
        booking_number: booking.booking_number,
        trx_id: trxId,
        rate: PLATFORM_FEE_RATE,
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
      description: `${Math.round((1 - PLATFORM_FEE_RATE) * 100)}% earning from booking ${booking.booking_number}`,
      meta: {
        booking_number: booking.booking_number,
        trx_id: trxId,
        rate: 1 - PLATFORM_FEE_RATE,
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
  PLATFORM_FEE_RATE,
  distributePaymentToWallets,
  getCaregiverEarningForBooking,
  reversePaymentWallets
};
