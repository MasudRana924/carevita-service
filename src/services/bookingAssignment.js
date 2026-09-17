const {
  hasOverlap,
  listRejectedIds,
  assignProvider,
  addStatusHistory,
  clearProvider
} = require('../models/Booking');
const Availability = require('../models/Availability');
const pool = require('../config/database');
const { STATUSES } = require('./bookingJourney');

const toTime = (value) => {
  const raw = String(value || '').slice(0, 8);
  return raw.length === 5 ? `${raw}:00` : raw;
};

const bookingWindow = (booking) => ({
  bookingDate: booking.booking_date,
  startTime: toTime(booking.start_time),
  endTime: toTime(booking.end_time)
});

const assertCaregiverFree = async (profile, booking, { excludeBookingId = null } = {}) => {
  if (!profile) {
    const error = new Error('Caregiver not found');
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }
  if (profile.is_available === false) {
    const error = new Error('Caregiver is not available');
    error.statusCode = 409;
    error.code = 'CONFLICT';
    throw error;
  }

  const window = bookingWindow(booking);
  const overlap = await hasOverlap({
    providerId: profile.id,
    bookingDate: window.bookingDate,
    startTime: window.startTime,
    endTime: window.endTime,
    excludeBookingId
  });
  if (overlap) {
    const error = new Error('Caregiver already has a booking in this time slot');
    error.statusCode = 409;
    error.code = 'CONFLICT';
    throw error;
  }

  const covers = await Availability.coversSlot(
    profile.id,
    window.bookingDate,
    window.startTime,
    window.endTime
  );
  if (!covers) {
    const error = new Error('Requested time is outside caregiver weekly availability');
    error.statusCode = 409;
    error.code = 'CONFLICT';
    throw error;
  }
};

const findNextCaregiver = async (booking, extraExclude = []) => {
  const rejected = await listRejectedIds(booking.id);
  const exclude = [...new Set([...rejected, booking.provider_id, ...extraExclude].filter(Boolean))];
  const window = bookingWindow(booking);

  const result = await pool.query(
    `
    SELECT cp.*
    FROM caregiver_profiles cp
    JOIN users u ON u.id = cp.user_id
    WHERE cp.is_available = true
      AND COALESCE(cp.verification_status, 'APPROVED') <> 'SUSPENDED'
      AND u.status = 'active'
      AND ($1::uuid[] IS NULL OR NOT (cp.id = ANY($1::uuid[])))
      AND (
        $2::text IS NULL
        OR cp.district ILIKE $2
        OR cp.thana ILIKE $3
      )
    ORDER BY
      CASE WHEN cp.district ILIKE $2 THEN 0 ELSE 1 END,
      cp.rating DESC NULLS LAST,
      cp.completed_bookings DESC NULLS LAST
    LIMIT 20
    `,
    [
      exclude.length ? exclude : null,
      booking.family_member_district || booking.district || null,
      booking.family_member_thana || booking.thana || null
    ]
  );

  for (const profile of result.rows) {
    const overlap = await hasOverlap({
      providerId: profile.id,
      bookingDate: window.bookingDate,
      startTime: window.startTime,
      endTime: window.endTime,
      excludeBookingId: booking.id
    });
    if (overlap) continue;
    const covers = await Availability.coversSlot(
      profile.id,
      window.bookingDate,
      window.startTime,
      window.endTime
    );
    if (!covers) continue;
    return profile;
  }

  return null;
};

const reassignOrSearch = async (booking, actorId, note) => {
  const next = await findNextCaregiver(booking, [booking.provider_id]);
  if (next) {
    const updated = await assignProvider(booking.id, next.id, STATUSES.PROVIDER_ASSIGNED);
    await addStatusHistory(
      booking.id,
      booking.status,
      STATUSES.PROVIDER_ASSIGNED,
      actorId,
      note || `Reassigned to caregiver ${next.id}`
    );
    return { booking: { ...updated, status: STATUSES.PROVIDER_ASSIGNED }, next, searching: false };
  }

  const updated = await clearProvider(booking.id, STATUSES.SEARCHING_PROVIDER);
  await addStatusHistory(
    booking.id,
    booking.status,
    STATUSES.SEARCHING_PROVIDER,
    actorId,
    note || 'No alternative caregiver found'
  );
  return { booking: updated, next: null, searching: true };
};

module.exports = {
  assertCaregiverFree,
  findNextCaregiver,
  reassignOrSearch,
  bookingWindow
};
