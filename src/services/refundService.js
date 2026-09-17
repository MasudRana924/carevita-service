const Payment = require('../models/Payment');
const PaymentRefund = require('../models/PaymentRefund');
const {
  grantAndSaveUserToken,
  refundBkashPayment,
  queryBkashRefundStatus,
  findCompletedRefund,
  isRefundCompleted
} = require('./bkashService');
const { reversePaymentWallets } = require('./walletService');

const clip = (value, max, fallback) => String(value || fallback).slice(0, max);

const processBookingRefund = async (booking, {
  refundAmount,
  reason = 'Booking cancelled',
  sku = null
} = {}) => {
  const amount = Number(Number(refundAmount).toFixed(2));
  if (!(amount > 0)) {
    return { skipped: true, reason: 'zero_amount' };
  }

  const list = await Payment.findByBookingId(booking.id);
  const payment = list.find((row) => {
    const status = String(row.status).toUpperCase();
    return ['COMPLETED', 'PARTIAL_REFUND'].includes(status);
  }) || list.find((row) => String(row.status).toUpperCase() === 'REFUNDED') || list[0];

  if (!payment || !payment.bkash_payment_id || !payment.trx_id) {
    return { skipped: true, reason: 'payment_not_found' };
  }

  const original = Number(payment.amount);
  const stats = await PaymentRefund.completedAmount(payment.id);
  const alreadyRefunded = Number(payment.refunded_amount || stats.total || 0);
  const remaining = Number((original - alreadyRefunded).toFixed(2));

  if (remaining <= 0 || String(payment.status).toUpperCase() === 'REFUNDED') {
    return {
      skipped: true,
      reason: 'already_refunded',
      payment,
      remaining: 0
    };
  }

  if (stats.attempts >= PaymentRefund.MAX_REFUNDS) {
    const error = new Error('Maximum 10 refunds already processed for this transaction');
    error.statusCode = 400;
    error.code = 'PAYMENT_FAILED';
    throw error;
  }

  if (amount > remaining) {
    const error = new Error(`Refund amount exceeds remaining BDT ${remaining.toFixed(2)}`);
    error.statusCode = 400;
    error.code = 'PAYMENT_FAILED';
    throw error;
  }

  const skuValue = clip(sku || booking.booking_number || 'CareMate', 255, 'CareMate');
  const reasonValue = clip(reason, 255, 'Refund');
  const saved = await grantAndSaveUserToken(booking.user_id);

  const refundRow = await PaymentRefund.createRefund({
    paymentId: payment.id,
    bookingId: booking.id,
    refundAmount: amount,
    sku: skuValue,
    reason: reasonValue,
    originalTrxId: payment.trx_id,
    status: 'PENDING'
  });

  let bkashRes;
  try {
    bkashRes = await refundBkashPayment(saved.id_token, {
      paymentId: payment.bkash_payment_id,
      trxId: payment.trx_id,
      refundAmount: amount,
      sku: skuValue,
      reason: reasonValue
    });
  } catch (error) {
    if (error.code === 'REFUND_TIMEOUT') {
      const statusBody = await queryBkashRefundStatus(saved.id_token, {
        paymentId: payment.bkash_payment_id,
        trxId: payment.trx_id
      });
      const matched = findCompletedRefund(statusBody, amount);
      if (!matched) {
        await PaymentRefund.markRefundRow(refundRow.id, {
          status: 'FAILED',
          response: { timeout: true, status: statusBody }
        });
        const timeoutError = new Error('Refund timed out and is not completed yet. Check refund status.');
        timeoutError.statusCode = 504;
        timeoutError.code = 'PAYMENT_FAILED';
        timeoutError.details = statusBody;
        throw timeoutError;
      }
      bkashRes = {
        originalTrxId: statusBody.originalTrxId || payment.trx_id,
        refundTrxId: matched.refundTrxId,
        refundTransactionStatus: matched.refundTransactionStatus,
        originalTrxAmount: statusBody.originalTrxAmount,
        refundAmount: matched.refundAmount,
        refundTransactions: statusBody.refundTransactions
      };
    } else {
      await PaymentRefund.markRefundRow(refundRow.id, {
        status: 'FAILED',
        response: error.details || { message: error.message }
      });
      throw error;
    }
  }

  if (!isRefundCompleted(bkashRes) && !findCompletedRefund({ refundTransactions: [bkashRes] }, amount)) {
    await PaymentRefund.markRefundRow(refundRow.id, {
      status: 'FAILED',
      response: bkashRes
    });
    const fail = new Error('Refund was not completed');
    fail.statusCode = 400;
    fail.code = 'PAYMENT_FAILED';
    fail.details = bkashRes;
    throw fail;
  }

  const refundRecord = await PaymentRefund.markRefundRow(refundRow.id, {
    status: 'COMPLETED',
    refundTrxId: bkashRes.refundTrxId,
    response: bkashRes
  });

  const updatedPayment = await Payment.markRefunded(payment.id, {
    refunded_amount: amount,
    refund_response: bkashRes
  });

  let wallet = null;
  try {
    wallet = await reversePaymentWallets({
      payment: updatedPayment,
      booking,
      amount
    });
  } catch (walletErr) {
    console.error('Wallet reverse after refund failed:', walletErr.message);
  }

  return {
    skipped: false,
    payment: updatedPayment,
    refund: refundRecord,
    remaining: Number((Number(updatedPayment.amount) - Number(updatedPayment.refunded_amount || 0)).toFixed(2)),
    bkash: bkashRes,
    wallet
  };
};

const getRefundStatus = async (payment) => {
  if (!payment?.bkash_payment_id || !payment?.trx_id) {
    const error = new Error('Payment does not have bKash paymentId/trxId');
    error.statusCode = 400;
    throw error;
  }
  const saved = await grantAndSaveUserToken(payment.user_id);
  const bkash = await queryBkashRefundStatus(saved.id_token, {
    paymentId: payment.bkash_payment_id,
    trxId: payment.trx_id
  });
  const local = await PaymentRefund.listByPaymentId(payment.id);
  return { payment, local, bkash };
};

module.exports = { processBookingRefund, getRefundStatus };
