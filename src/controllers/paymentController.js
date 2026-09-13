const crypto = require('crypto');
const { findById, updatePaymentStatus } = require('../models/Booking');
const Payment = require('../models/Payment');
const {
  grantAndSaveUserToken,
  ensureUserToken,
  createBkashPayment,
  executeBkashPayment,
  bkashConfig
} = require('../services/bkashService');
const { distributePaymentToWallets } = require('../services/walletService');
const { getCaregiverProfileById } = require('../models/CaregiverProfile');
const { notifyUser } = require('../services/pushNotificationService');
const {
  canUserPayBooking,
  payableAmount
} = require('../services/paymentEligibility');

const uniqueInvoice = () =>
  `CM${Date.now()}${crypto.randomBytes(3).toString('hex')}`.slice(0, 30);

/**
 * Grant bKash token for current user and save in bkash_tokens
 * POST /payments/bkash/token
 */
exports.getToken = async (req, res) => {
  try {
    const saved = await grantAndSaveUserToken(req.user.id);

    res.success(
      {
        id_token: saved.id_token,
        expires_at: saved.expires_at.toISOString(),
        expires_in: saved.expires_in,
        script: bkashConfig.script
      },
      'bKash token granted'
    );
  } catch (error) {
    console.error('bKash getToken error:', error.details || error.message);
    res.error(
      error.message || 'Failed to get bKash token',
      error.details || [],
      500
    );
  }
};

/**
 * Create payment:
 * 1) grant token → save by user_id
 * 2) create payment with authorization: id_token
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

    // Always grant → DB save → then create with that id_token in authorization header
    const { id_token: idToken } = await grantAndSaveUserToken(req.user.id);
    const merchantInvoice = uniqueInvoice();

    const bkashRes = await createBkashPayment(idToken, {
      amount: amount.toFixed(2),
      merchantInvoiceNumber: merchantInvoice
    });

    if (bkashRes?.errorCode && String(bkashRes.errorCode) !== '0000') {
      return res.error('bKash create payment failed', bkashRes);
    }

    if (!bkashRes?.paymentID) {
      return res.error('bKash did not return paymentID', bkashRes);
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
      error.details || error.response?.data || error.message,
      error.stack
    );
    res.error(
      error.message || 'Failed to create payment',
      error.details || [],
      500
    );
  }
};

/**
 * Execute payment using user's saved id_token (refresh if needed)
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

    // Use DB token; if missing/expired grant again and save
    let idToken = await ensureUserToken(req.user.id);

    let bkashRes;
    try {
      bkashRes = await executeBkashPayment(idToken, paymentID);
    } catch (firstErr) {
      console.warn('bKash execute retry after grant:', firstErr.details || firstErr.message);
      const saved = await grantAndSaveUserToken(req.user.id);
      idToken = saved.id_token;
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

    // Booking payment status: PAID (else remains PENDING/unpaid)
    const updatedBooking = await updatePaymentStatus(booking.id, 'PAID', 'BKASH');

    const paidAmount = Number(bkashRes.amount || payment.amount || 0);
    const trxId = bkashRes.trxID || bkashRes.trxId || null;

    let walletResult = null;
    let caregiverUserId = null;

    try {
      if (booking.provider_type === 'CAREGIVER' && booking.provider_id) {
        const caregiver = await getCaregiverProfileById(booking.provider_id);
        caregiverUserId = caregiver?.user_id || null;

        if (caregiverUserId) {
          walletResult = await distributePaymentToWallets({
            payment: updatedPayment,
            booking,
            caregiverUserId,
            paidAmount,
            trxId
          });

          await notifyUser({
            userId: caregiverUserId,
            title: 'Payment Received — Start Booking',
            body: `User paid for booking ${booking.booking_number}. You can start the booking now.`,
            type: 'PAYMENT_RECEIVED',
            bookingId: booking.id,
            referenceId: booking.id,
            referenceType: 'booking',
            extraData: {
              booking_number: booking.booking_number,
              amount: String(paidAmount),
              trx_id: String(trxId || ''),
              payment_status: 'PAID',
              action: 'START_BOOKING',
              screen: 'booking_details'
            }
          });
        }
      }
    } catch (postPayErr) {
      console.error('Post-payment wallet/notify failed:', postPayErr.message);
    }

    res.success(
      {
        booking: updatedBooking,
        payment: updatedPayment,
        bkash: bkashRes,
        wallet: walletResult
          ? {
              platform_fee: walletResult.platform_fee,
              caregiver_earning: walletResult.caregiver_earning,
              paid_amount: walletResult.paid_amount,
              skipped: walletResult.skipped || false
            }
          : null
      },
      'Payment completed successfully'
    );
  } catch (error) {
    console.error(
      'bKash executePayment error:',
      error.details || error.response?.data || error.message,
      error.stack
    );
    res.error(
      error.message || 'Failed to execute payment',
      error.details || [],
      500
    );
  }
};
