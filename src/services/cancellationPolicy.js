const {
  getScheduledStartAt,
  STATUSES,
  TERMINAL_STATUSES
} = require('./bookingJourney');
const {
  CANCEL_FULL_REFUND_HOURS,
  CANCEL_PARTIAL_REFUND_HOURS,
  CANCEL_PARTIAL_REFUND_PERCENT
} = require('../config/platform');

const hoursUntilStart = (booking) => {
  const start = getScheduledStartAt(booking);
  if (!start) return 0;
  return (new Date(start).getTime() - Date.now()) / (1000 * 60 * 60);
};

const evaluateCancellation = (booking, { byAdmin = false } = {}) => {
  const status = String(booking.status || '').toUpperCase();

  if (TERMINAL_STATUSES.includes(status)) {
    return { canCancel: false, message: 'Booking is already closed' };
  }

  if (status === STATUSES.SERVICE_IN_PROGRESS && !byAdmin) {
    return { canCancel: false, message: 'Cannot cancel after service has started' };
  }

  const paid = String(booking.payment_status || '').toUpperCase() === 'PAID'
    || status === STATUSES.PAYMENT_PAID
    || status === STATUSES.SERVICE_IN_PROGRESS;

  if (!paid) {
    return {
      canCancel: true,
      refundPercent: 0,
      refundAmount: 0,
      policy: 'UNPAID'
    };
  }

  const hours = hoursUntilStart(booking);
  let refundPercent = 0;
  let policy = 'NO_REFUND';

  if (byAdmin || hours >= CANCEL_FULL_REFUND_HOURS) {
    refundPercent = 100;
    policy = 'FULL_REFUND';
  } else if (hours >= CANCEL_PARTIAL_REFUND_HOURS) {
    refundPercent = CANCEL_PARTIAL_REFUND_PERCENT;
    policy = 'PARTIAL_REFUND';
  }

  const paidAmount = Number(booking.advance_amount || booking.total_amount || 0);
  const refundAmount = Number(((paidAmount * refundPercent) / 100).toFixed(2));

  return {
    canCancel: true,
    refundPercent,
    refundAmount,
    hoursUntilStart: Number(hours.toFixed(2)),
    policy,
    fullRefundHours: CANCEL_FULL_REFUND_HOURS,
    partialRefundHours: CANCEL_PARTIAL_REFUND_HOURS,
    partialRefundPercent: CANCEL_PARTIAL_REFUND_PERCENT
  };
};

module.exports = {
  hoursUntilStart,
  evaluateCancellation
};
