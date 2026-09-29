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

const DHAKA_OFFSET = '+06:00';

const datePartOf = (bookingDate) => {
  if (!bookingDate) return null;
  if (typeof bookingDate === 'string') return bookingDate.slice(0, 10);
  return bookingDate.toISOString().slice(0, 10);
};

const timePartOf = (timeValue, fallback = '00:00:00') => {
  const timeRaw = timeValue ? String(timeValue).slice(0, 8) : fallback;
  return timeRaw.length === 5 ? `${timeRaw}:00` : timeRaw;
};

/** Wall-clock booking times are Asia/Dhaka (UTC+6, no DST). */
const dhakaInstant = (bookingDate, timeValue) => {
  const datePart = datePartOf(bookingDate);
  if (!datePart) return null;
  const dt = new Date(`${datePart}T${timePartOf(timeValue)}${DHAKA_OFFSET}`);
  return Number.isNaN(dt.getTime()) ? null : dt.toISOString();
};

const getScheduledStartAt = (booking) => {
  if (!booking?.booking_date) return null;
  return dhakaInstant(booking.booking_date, booking.start_time || '00:00:00');
};

const getScheduledEndAt = (booking) => {
  const startIso = getScheduledStartAt(booking);
  if (!startIso) return null;

  const hours = Number(booking.duration_hours);
  if (Number.isFinite(hours) && hours > 0) {
    return new Date(new Date(startIso).getTime() + hours * 60 * 60 * 1000).toISOString();
  }

  if (!booking.end_time) return startIso;
  const endIso = dhakaInstant(booking.booking_date, booking.end_time);
  if (!endIso) return startIso;
  if (new Date(endIso).getTime() <= new Date(startIso).getTime()) {
    return new Date(new Date(endIso).getTime() + 24 * 60 * 60 * 1000).toISOString();
  }
  return endIso;
};

const isInstantReached = (iso, now = Date.now()) => {
  if (!iso) return true;
  return now >= new Date(iso).getTime();
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

const { presentBooking } = require('../utils/phiPolicy');

const journeyFlags = (booking, { userId, asProvider, review = null }) => {
  const status = String(booking.status || '').toUpperCase();
  const isOwner = booking.user_id === userId;
  const scheduled_start_at = getScheduledStartAt(booking);
  const scheduled_end_at = getScheduledEndAt(booking);
  const is_start_time_reached = isInstantReached(scheduled_start_at);
  const is_end_time_reached = isInstantReached(scheduled_end_at);
  const suggestionExpiresAt = booking.suggestion_expires_at
    ? new Date(booking.suggestion_expires_at).getTime()
    : null;
  const awaiting_next_caregiver = status === STATUSES.SEARCHING_PROVIDER
    && !!booking.suggested_provider_id
    && (suggestionExpiresAt == null || suggestionExpiresAt >= Date.now());
  const inBookedWindow = !scheduled_start_at
    || (is_start_time_reached && !is_end_time_reached);

  return {
    can_start: !!asProvider && status === STATUSES.PAYMENT_PAID && inBookedWindow,
    can_complete: !!asProvider
      && status === STATUSES.SERVICE_IN_PROGRESS
      && (!scheduled_end_at || is_end_time_reached),
    can_report_no_start: !!asProvider
      && status === STATUSES.PAYMENT_PAID
      && !!scheduled_end_at
      && is_end_time_reached
      && !booking.no_start_reported_at,
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
    scheduled_end_at,
    is_start_time_reached,
    is_end_time_reached,
    awaiting_next_caregiver,
    can_accept_next_caregiver: isOwner && awaiting_next_caregiver,
    can_decline_next_caregiver: isOwner && awaiting_next_caregiver,
    suggestion_expires_at: booking.suggestion_expires_at || null,
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
  getScheduledEndAt,
  isInstantReached,
  publicReview,
  presentBooking,
  journeyFlags
};
