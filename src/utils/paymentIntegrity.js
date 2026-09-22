/**
 * Reconcile bKash reported amount against booking payable (server-side truth).
 * @returns {{ ok: true, amount: number } | { ok: false, message: string, expected: number, received: number }}
 */
const reconcilePaymentAmount = (booking, reportedAmount, { tolerance = 0.01 } = {}) => {
  const advance = Number(booking?.advance_amount);
  const total = Number(booking?.total_amount);
  const expected = advance > 0 ? advance : (total || 0);
  const received = Number(reportedAmount);

  if (!(expected > 0)) {
    return { ok: false, message: 'Booking has no payable amount', expected: 0, received };
  }
  if (!Number.isFinite(received)) {
    return { ok: false, message: 'Payment amount missing', expected, received: NaN };
  }
  if (Math.abs(received - expected) > tolerance) {
    return {
      ok: false,
      message: `Payment amount mismatch: expected ${expected.toFixed(2)}, got ${received.toFixed(2)}`,
      expected,
      received
    };
  }
  return { ok: true, amount: expected };
};

/**
 * Platform fee for a paid slice using booking snapshot (not live env rate).
 */
const snapshotPlatformFeeForPaidAmount = (booking, paidAmount) => {
  const paid = Number(paidAmount);
  const total = Number(booking?.total_amount);
  const snapFee = Number(booking?.platform_fee);

  if (!(paid > 0)) return 0;

  if (Number.isFinite(snapFee) && snapFee >= 0 && Number.isFinite(total) && total > 0) {
    return Number(((snapFee / total) * paid).toFixed(2));
  }

  // Fallback only if snapshot missing (legacy rows)
  const { PLATFORM_FEE_RATE } = require('../config/platform');
  return Number((paid * PLATFORM_FEE_RATE).toFixed(2));
};

module.exports = {
  reconcilePaymentAmount,
  snapshotPlatformFeeForPaidAmount
};
