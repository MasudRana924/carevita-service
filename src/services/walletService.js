const pool = require('../config/database');
const Wallet = require('../models/Wallet');

const PLATFORM_FEE_RATE = 0.05; // 5%

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
      description: `5% service fee from booking ${booking.booking_number}`,
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
      description: `95% earning from booking ${booking.booking_number}`,
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

module.exports = {
  PLATFORM_FEE_RATE,
  distributePaymentToWallets
};
