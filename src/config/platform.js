const envNumber = (name, fallback) => {
  const raw = process.env[name];
  const value = raw == null ? fallback : Number(raw);
  return Number.isFinite(value) ? value : fallback;
};

module.exports = {
  PLATFORM_FEE_RATE: envNumber('PLATFORM_FEE_RATE', 0.05),
  CANCEL_FULL_REFUND_HOURS: envNumber('CANCEL_FULL_REFUND_HOURS', 24),
  CANCEL_PARTIAL_REFUND_HOURS: envNumber('CANCEL_PARTIAL_REFUND_HOURS', 6),
  CANCEL_PARTIAL_REFUND_PERCENT: envNumber('CANCEL_PARTIAL_REFUND_PERCENT', 50),
  MIN_WITHDRAWAL_AMOUNT: envNumber('MIN_WITHDRAWAL_AMOUNT', 100),
  /** Minutes a caregiver has to accept PROVIDER_ASSIGNED before the user is asked to pick the next caregiver */
  ACCEPT_OFFER_TIMEOUT_MINUTES: envNumber('ACCEPT_OFFER_TIMEOUT_MINUTES', 5),
  /** Minutes the user has to continue with the suggested next caregiver before the booking is cancelled */
  SUGGESTION_RESPONSE_TIMEOUT_MINUTES: envNumber('SUGGESTION_RESPONSE_TIMEOUT_MINUTES', 30)
};
