const {
  hasOverlap,
  listRejectedIds,
  assignProvider,
  addStatusHistory,
  clearProvider,
  setOfferExpiry
} = require('../models/Booking');
const Availability = require('../models/Availability');
const pool = require('../config/database');
const { STATUSES } = require('./bookingJourney');
const { ACCEPT_OFFER_TIMEOUT_MINUTES } = require('../config/platform');

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

/**
 * Prefer caregivers matching hospital district (joined) or family district/thana.
 */
const findNextCaregiver = async (booking, extraExclude = []) => {
  const rejected = await listRejectedIds(booking.id);
  const exclude = [...new Set([...rejected, booking.provider_id, ...extraExclude].filter(Boolean))];
  const window = bookingWindow(booking);

  const districtHint =
    booking.hospital_district ||
    booking.family_member_district ||
    booking.district ||
    null;
  const thanaHint = booking.family_member_thana || booking.thana || null;

  const result = await pool.query(
    `
    SELECT cp.*
    FROM caregiver_profiles cp
    JOIN users u ON u.id = cp.user_id
    LEFT JOIN hospitals h ON h.id = $4::uuid
    WHERE cp.is_available = true
      AND COALESCE(cp.verification_status, 'APPROVED') <> 'SUSPENDED'
      AND u.status = 'active'
      AND ($1::uuid[] IS NULL OR NOT (cp.id = ANY($1::uuid[])))
      AND (
        COALESCE(h.district, $2::text) IS NULL
        OR cp.district ILIKE COALESCE(h.district, $2)
        OR (
          COALESCE($3::text, '') <> ''
          AND cp.thana ILIKE $3
        )
      )
    ORDER BY
      CASE
        WHEN h.district IS NOT NULL AND cp.district ILIKE h.district THEN 0
        WHEN $2::text IS NOT NULL AND cp.district ILIKE $2 THEN 1
        WHEN $3::text IS NOT NULL AND cp.thana ILIKE $3 THEN 2
        ELSE 3
      END,
      cp.rating DESC NULLS LAST,
      cp.completed_bookings DESC NULLS LAST
    LIMIT 20
    `,
    [
      exclude.length ? exclude : null,
      districtHint,
      thanaHint,
      booking.hospital_id || null
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
    let updated = await assignProvider(booking.id, next.id, STATUSES.PROVIDER_ASSIGNED);
    updated = (await setOfferExpiry(booking.id, ACCEPT_OFFER_TIMEOUT_MINUTES)) || updated;
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
