const crypto = require('crypto');
const { findById, updatePaymentStatus } = require('../models/Booking');
const Payment = require('../models/Payment');
const {
  ensureUserToken,
  grantTokenFromBkash,
  createBkashPayment,
  executeBkashPayment,
  bkashConfig
} = require('../services/bkashService');
const { upsertToken } = require('../models/BkashToken');
const { getCaregiverProfileById } = require('../models/CaregiverProfile');
const { notifyUser } = require('../services/pushNotificationService');
const {
  canUserPayBooking,
  payableAmount
} = require('../services/paymentEligibility');

const uniqueInvoice = () =>
  `CM${Date.now()}${crypto.randomBytes(3).toString('hex')}`.slice(0, 30);

/**
 * Grant / refresh bKash token and store per user in bkash_tokens
 * POST /payments/bkash/token
 */
exports.getToken = async (req, res) => {
  try {
    const granted = await grantTokenFromBkash();
    const expiresAt = new Date(Date.now() + bkashConfig.tokenTtlSeconds * 1000);
    await upsertToken(req.user.id, granted.id_token, expiresAt);

    res.success(
      {
        id_token: granted.id_token,
        expires_at: expiresAt.toISOString(),
        script: bkashConfig.script
      },
      'bKash token granted'
    );
  } catch (error) {
    console.error('bKash getToken error:', error.response?.data || error.message);
    res.serverError('Failed to get bKash token');
  }
};

/**
 * Create bKash payment for an accepted booking (Pay Now)
 * POST /payments/bkash/create  { booking_id }
 */
exports.createPayment = async (req, res) => {
  try {
    const { booking_id } = req.body;
    if (!booking_id) return res.error('booking_id is required');

    const booking = await findById(booking_id);
    if (!booking) return res.notFound('Booking not found');

    if (!canUserPayBooking(booking, req.user.id)) {
      return res.error(
        'Payment not allowed. Booking must be accepted by caregiver and not already paid.'
      );
    }

    const amount = payableAmount(booking);
    if (!(amount > 0)) return res.error('Invalid payable amount for this booking');

    let idToken = await ensureUserToken(req.user.id);
    const merchantInvoice = uniqueInvoice();

    let bkashRes;
    try {
      bkashRes = await createBkashPayment(idToken, {
        amount: amount.toFixed(2),
        merchantInvoiceNumber: merchantInvoice
      });
    } catch (firstErr) {
      console.warn(
        'bKash create retry after token refresh:',
        firstErr.response?.data || firstErr.message
      );
      const granted = await grantTokenFromBkash();
      const expiresAt = new Date(Date.now() + bkashConfig.tokenTtlSeconds * 1000);
      await upsertToken(req.user.id, granted.id_token, expiresAt);
      idToken = granted.id_token;
      bkashRes = await createBkashPayment(idToken, {
        amount: amount.toFixed(2),
        merchantInvoiceNumber: merchantInvoice
      });
    }

    if (bkashRes?.errorCode && String(bkashRes.errorCode) !== '0000') {
      return res.error('bKash create payment failed', bkashRes);
    }

    const payment = await Payment.createPayment({
      user_id: req.user.id,
      booking_id: booking.id,
      amount,
      merchant_invoice: merchantInvoice,
      bkash_payment_id: bkashRes.paymentID || null,
      status: 'INITIATED',
      create_response: bkashRes
    });

    res.success(
      {
        payment_id: payment.id,
        booking_id: booking.id,
        amount,
        currency: 'BDT',
        merchantInvoiceNumber: merchantInvoice,
        paymentID: bkashRes.paymentID,
        bkashURL: bkashRes.bkashURL,
        script: bkashConfig.script,
        bkash: bkashRes
      },
      'Payment created'
    );
  } catch (error) {
    console.error(
      'bKash createPayment error:',
      error.response?.data || error.message,
      error.stack
    );
    res.serverError('Failed to create payment');
  }
};

/**
 * Execute bKash payment after user confirms in checkout
 * POST /payments/bkash/execute  { paymentID, booking_id? }
 */
exports.executePayment = async (req, res) => {
  try {
    const { paymentID, booking_id } = req.body;
    if (!paymentID) return res.error('paymentID is required');

    let payment = await Payment.findByBkashPaymentId(paymentID);
    if (!payment && booking_id) {
      const list = await Payment.findByBookingId(booking_id);
      payment = list.find((p) => p.bkash_payment_id === paymentID) || list[0] || null;
    }

    if (!payment) {
      return res.notFound('Payment record not found. Create payment first.');
    }
    if (payment.user_id !== req.user.id) {
      return res.forbidden('Access denied');
    }

    const booking = await findById(payment.booking_id);
    if (!booking) return res.notFound('Booking not found');

    if (String(booking.payment_status || '').toUpperCase() === 'PAID') {
      return res.success(
        { booking, payment, already_paid: true },
        'Booking already paid'
      );
    }

    let idToken = await ensureUserToken(req.user.id);
    let bkashRes;
    try {
      bkashRes = await executeBkashPayment(idToken, paymentID);
    } catch (firstErr) {
      console.warn(
        'bKash execute retry after token refresh:',
        firstErr.response?.data || firstErr.message
      );
      const granted = await grantTokenFromBkash();
      const expiresAt = new Date(Date.now() + bkashConfig.tokenTtlSeconds * 1000);
      await upsertToken(req.user.id, granted.id_token, expiresAt);
      idToken = granted.id_token;
      bkashRes = await executeBkashPayment(idToken, paymentID);
    }

    const txnStatus = String(
      bkashRes?.transactionStatus || bkashRes?.trxStatus || ''
    ).toUpperCase();
    const success =
      txnStatus === 'COMPLETED' ||
      bkashRes?.statusCode === '0000' ||
      String(bkashRes?.statusMessage || '').toLowerCase().includes('successful');

    if (!success) {
      await Payment.markExecuted(payment.id, {
        status: 'FAILED',
        execute_response: bkashRes,
        bkash_payment_id: paymentID
      });
      return res.error('Payment execution failed', bkashRes);
    }

    const updatedPayment = await Payment.markExecuted(payment.id, {
      status: 'COMPLETED',
      trx_id: bkashRes.trxID || bkashRes.trxId || null,
      execute_response: bkashRes,
      bkash_payment_id: paymentID
    });

    const updatedBooking = await updatePaymentStatus(booking.id, 'PAID', 'BKASH');

    try {
      if (booking.provider_type === 'CAREGIVER' && booking.provider_id) {
        const caregiver = await getCaregiverProfileById(booking.provider_id);
        if (caregiver?.user_id) {
          await notifyUser({
            userId: caregiver.user_id,
            title: 'Payment Received',
            body: `User paid for booking ${booking.booking_number}. Amount: ৳${Number(payment.amount).toFixed(2)}`,
            type: 'PAYMENT_RECEIVED',
            bookingId: booking.id,
            referenceId: booking.id,
            referenceType: 'booking',
            extraData: {
              booking_number: booking.booking_number,
              amount: String(payment.amount),
              trx_id: String(bkashRes.trxID || bkashRes.trxId || ''),
              screen: 'inbox'
            }
          });
        }
      }
    } catch (notifyErr) {
      console.error('Notify caregiver on payment failed:', notifyErr.message);
    }

    res.success(
      {
        booking: updatedBooking,
        payment: updatedPayment,
        bkash: bkashRes
      },
      'Payment completed successfully'
    );
  } catch (error) {
    console.error(
      'bKash executePayment error:',
      error.response?.data || error.message,
      error.stack
    );
    res.serverError('Failed to execute payment');
  }
};
