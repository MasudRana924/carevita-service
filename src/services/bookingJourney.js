const getScheduledStartAt = (booking) => {
  if (!booking?.booking_date) return null;

  const datePart = booking.booking_date instanceof Date
    ? booking.booking_date.toISOString().slice(0, 10)
    : String(booking.booking_date).slice(0, 10);

  const timeRaw = booking.start_time ? String(booking.start_time).slice(0, 8) : '00:00:00';
  const timePart = timeRaw.length === 5 ? `${timeRaw}:00` : timeRaw;
  const dt = new Date(`${datePart}T${timePart}`);
  return Number.isNaN(dt.getTime()) ? null : dt.toISOString();
};

const publicReview = (review) => {
  if (!review) return null;
  return {
    id: review.id,
    rating: Number(review.rating),
    created_at: review.created_at
  };
};

const journeyFlags = (booking, { userId, asProvider, review = null }) => {
  const status = String(booking.status || '').toUpperCase();
  const isOwner = booking.user_id === userId;
  const scheduled_start_at = getScheduledStartAt(booking);
  const is_start_time_reached = scheduled_start_at
    ? Date.now() >= new Date(scheduled_start_at).getTime()
    : true;

  return {
    can_start: !!asProvider && status === 'PAYMENT_PAID',
    can_complete: !!asProvider && status === 'SERVICE_IN_PROGRESS',
    can_review: isOwner && status === 'SERVICE_COMPLETED' && !review,
    scheduled_start_at,
    is_start_time_reached,
    payout_status: booking.payout_status || (booking.earning_settled_at ? 'SETTLED_TO_WALLET' : 'PENDING'),
    review: publicReview(review)
  };
};

module.exports = {
  getScheduledStartAt,
  publicReview,
  journeyFlags
};
