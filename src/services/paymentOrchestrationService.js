const { findById, updatePaymentStatus, addStatusHistory } = require('../models/Booking');
const Payment = require('../models/Payment');
const { distributePaymentToWallets } = require('./walletService');
const { getCaregiverProfileById } = require('../models/CaregiverProfile');
const { notifyUser } = require('./pushNotificationService');

/**
 * After bKash reports success: mark payment, booking, wallets, notify caregiver.
 */
const completeSuccessfulPayment = async ({ payment, booking, userId, bkashRes }) => {
  const updatedPayment = await Payment.markExecuted(payment.id, {
    status: 'COMPLETED',
    trx_id: bkashRes.trxID || bkashRes.trxId || null,
    execute_response: bkashRes,
    bkash_payment_id: payment.bkash_payment_id || bkashRes.paymentID
  });

  const updatedBooking = await updatePaymentStatus(booking.id, 'PAID', 'BKASH');
  try {
    await addStatusHistory(
      booking.id,
      booking.status,
      'PAYMENT_PAID',
      userId,
      'Payment completed via bKash'
    );
  } catch (historyErr) {
    console.error('Payment status history failed:', historyErr.message);
  }

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
            status: 'PAYMENT_PAID',
            action: 'START_BOOKING',
            screen: 'booking_details'
          }
        });
      }
    }
  } catch (postPayErr) {
    console.error('Post-payment wallet/notify failed:', postPayErr.message);
  }

  return {
    booking: updatedBooking || (await findById(booking.id)),
    payment: updatedPayment,
    walletResult,
    bkashRes,
    paidAmount,
    trxId
  };
};

module.exports = {
  completeSuccessfulPayment
};
