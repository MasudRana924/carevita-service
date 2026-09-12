const unpaidStatuses = new Set(['PENDING', 'FAILED', 'UNPAID', '']);

const canUserPayBooking = (booking, userId) => {
  if (!booking || booking.user_id !== userId) return false;
  if (booking.status !== 'PROVIDER_ACCEPTED') return false;
  const ps = String(booking.payment_status || 'PENDING').toUpperCase();
  return unpaidStatuses.has(ps);
};

const payableAmount = (booking) => {
  const advance = Number(booking.advance_amount);
  if (advance > 0) return advance;
  return Number(booking.total_amount) || 0;
};

module.exports = {
  canUserPayBooking,
  payableAmount
};
