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
  MIN_WITHDRAWAL_AMOUNT: envNumber('MIN_WITHDRAWAL_AMOUNT', 100)
};
