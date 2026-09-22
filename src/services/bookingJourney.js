const STATUSES = {
  SEARCHING_PROVIDER: 'SEARCHING_PROVIDER',
  PROVIDER_ASSIGNED: 'PROVIDER_ASSIGNED',
  PROVIDER_ACCEPTED: 'PROVIDER_ACCEPTED',
  PAYMENT_PAID: 'PAYMENT_PAID',
  SERVICE_IN_PROGRESS: 'SERVICE_IN_PROGRESS',
  SERVICE_COMPLETED: 'SERVICE_COMPLETED',
  CANCELLED_BY_USER: 'CANCELLED_BY_USER',
  CANCELLED_BY_PROVIDER: 'CANCELLED_BY_PROVIDER',
  CANCELLED_BY_ADMIN: 'CANCELLED_BY_ADMIN'
};

const ACTIVE_PROVIDER_STATUSES = [
  STATUSES.PROVIDER_ASSIGNED,
  STATUSES.PROVIDER_ACCEPTED,
  STATUSES.PAYMENT_PAID,
  STATUSES.SERVICE_IN_PROGRESS
];

const TERMINAL_STATUSES = [
  STATUSES.SERVICE_COMPLETED,
  STATUSES.CANCELLED_BY_USER,
  STATUSES.CANCELLED_BY_PROVIDER,
  STATUSES.CANCELLED_BY_ADMIN
];

const TRANSITIONS = {
  [STATUSES.SEARCHING_PROVIDER]: [
    STATUSES.PROVIDER_ASSIGNED,
    STATUSES.CANCELLED_BY_USER,
    STATUSES.CANCELLED_BY_ADMIN
  ],
  [STATUSES.PROVIDER_ASSIGNED]: [
    STATUSES.PROVIDER_ACCEPTED,
    STATUSES.SEARCHING_PROVIDER,
    STATUSES.PROVIDER_ASSIGNED,
    STATUSES.CANCELLED_BY_USER,
    STATUSES.CANCELLED_BY_ADMIN
  ],
  [STATUSES.PROVIDER_ACCEPTED]: [
    STATUSES.PAYMENT_PAID,
    STATUSES.SEARCHING_PROVIDER,
    STATUSES.PROVIDER_ASSIGNED,
    STATUSES.CANCELLED_BY_USER,
    STATUSES.CANCELLED_BY_PROVIDER,
    STATUSES.CANCELLED_BY_ADMIN
  ],
  [STATUSES.PAYMENT_PAID]: [
    STATUSES.SERVICE_IN_PROGRESS,
    STATUSES.CANCELLED_BY_USER,
    STATUSES.CANCELLED_BY_ADMIN
  ],
  [STATUSES.SERVICE_IN_PROGRESS]: [
    STATUSES.SERVICE_COMPLETED,
    STATUSES.CANCELLED_BY_ADMIN
  ],
  [STATUSES.SERVICE_COMPLETED]: [],
  [STATUSES.CANCELLED_BY_USER]: [],
  [STATUSES.CANCELLED_BY_PROVIDER]: [],
  [STATUSES.CANCELLED_BY_ADMIN]: []
};

const canTransition = (from, to) => {
  const current = String(from || '').toUpperCase();
  const next = String(to || '').toUpperCase();
  return (TRANSITIONS[current] || []).includes(next);
};

const assertTransition = (from, to) => {
  if (!canTransition(from, to)) {
    const error = new Error(`Cannot change booking status from ${from} to ${to}`);
    error.statusCode = 400;
    error.code = 'BAD_REQUEST';
    throw error;
  }
};

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
    comment: review.comment || null,
    created_at: review.created_at
  };
};

const presentBooking = (booking, { asProvider = false } = {}) => {
  if (!booking) return booking;
  if (!asProvider) return booking;

  const hidden = { ...booking };
  delete hidden.patient_requirements;
  delete hidden.medical_history;
  delete hidden.existing_conditions;
  delete hidden.allergies;
  delete hidden.current_medications;
  delete hidden.family_member_blood_group;
  return hidden;
};

const journeyFlags = (booking, { userId, asProvider, review = null }) => {
  const status = String(booking.status || '').toUpperCase();
  const isOwner = booking.user_id === userId;
  const scheduled_start_at = getScheduledStartAt(booking);
  const is_start_time_reached = scheduled_start_at
    ? Date.now() >= new Date(scheduled_start_at).getTime()
    : true;

  return {
    can_start: !!asProvider && status === STATUSES.PAYMENT_PAID,
    can_complete: !!asProvider && status === STATUSES.SERVICE_IN_PROGRESS,
    can_live_track: isOwner && status === STATUSES.SERVICE_IN_PROGRESS,
    live_tracking_active: status === STATUSES.SERVICE_IN_PROGRESS,
    can_publish_location: !!asProvider && status === STATUSES.SERVICE_IN_PROGRESS,
    can_review: isOwner && status === STATUSES.SERVICE_COMPLETED && !review,
    can_cancel: isOwner
      ? ![STATUSES.SERVICE_IN_PROGRESS, ...TERMINAL_STATUSES].includes(status)
      : !!asProvider && [STATUSES.PROVIDER_ASSIGNED, STATUSES.PROVIDER_ACCEPTED].includes(status),
    can_dispute: (isOwner || asProvider) && [
      STATUSES.PAYMENT_PAID,
      STATUSES.SERVICE_IN_PROGRESS,
      STATUSES.SERVICE_COMPLETED
    ].includes(status),
    scheduled_start_at,
    is_start_time_reached,
    payout_status: booking.payout_status || (booking.earning_settled_at ? 'SETTLED_TO_WALLET' : 'PENDING'),
    review: publicReview(review)
  };
};

module.exports = {
  STATUSES,
  ACTIVE_PROVIDER_STATUSES,
  TERMINAL_STATUSES,
  TRANSITIONS,
  canTransition,
  assertTransition,
  getScheduledStartAt,
  publicReview,
  presentBooking,
  journeyFlags
};
