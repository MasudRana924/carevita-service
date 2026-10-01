const {
  createBooking,
  findById,
  addStatusHistory,
  addRejection,
  startService,
  complete,
  settleEarning,
  cancel,
  releaseProviderForSuggestion,
  releaseExpiredOffer,
  attachSuggestion,
  clearSuggestion,
  claimSuggestion,
  cancelSearchingBooking,
  cancelExpiredSuggestion,
  saveNoStartReport
} = require('../models/Booking');
const pool = require('../config/database');
const { findByUserIdAndId } = require('../models/FamilyMember');
const { findById: findUserById } = require('../models/User');
const {
  getCaregiverProfileByUserId,
  getCaregiverProfileById,
  updateRating,
  incrementCompletedBookings
} = require('../models/CaregiverProfile');
const Review = require('../models/Review');
const Dispute = require('../models/Dispute');
const { notifyUser } = require('./pushNotificationService');
const {
  canUserPayBooking,
  payableAmount
} = require('./paymentEligibility');
const { bkashConfig } = require('./bkashService');
const {
  journeyFlags,
  presentBooking,
  STATUSES,
  assertTransition,
  getScheduledStartAt,
  getScheduledEndAt,
  isInstantReached
} = require('./bookingJourney');
const { getCaregiverEarningForBooking } = require('./walletService');
const { calculateBookingPrice } = require('./pricingService');
const { assertCaregiverFree, findNextCaregiver } = require('./bookingAssignment');
const { evaluateCancellation } = require('./cancellationPolicy');
const { processBookingRefund } = require('./refundService');
const { writeAudit } = require('../utils/audit');
const {
  ACCEPT_OFFER_TIMEOUT_MINUTES,
  SUGGESTION_RESPONSE_TIMEOUT_MINUTES
} = require('../config/platform');
const {
  BOOK_FOR_SELF,
  BOOK_FOR_FAMILY,
  assertBookingSubject,
  buildSelfPatientSnapshot,
  buildFamilyPatientSnapshot
} = require('./selfBooking');
const { invalidateCaregiverCatalog } = require('./catalogCache');
const bookingChatService = require('./bookingChatService');

const resolveCaregiverProfileId = async (userId) => {
  const profile = await getCaregiverProfileByUserId(userId);
  return profile ? profile.id : null;
};

const isAssignedCaregiver = async (booking, userId) => {
  if (booking.provider_type !== 'CAREGIVER') return false;
  const providerProfileId = await resolveCaregiverProfileId(userId);
  return !!providerProfileId && booking.provider_id === providerProfileId;
};

const withJourney = async (booking, userId) => {
  const asProvider = await isAssignedCaregiver(booking, userId);
  const review = await Review.findByBookingId(booking.id);
  const flags = journeyFlags(booking, { userId, asProvider, review });
  const can_pay = canUserPayBooking(booking, userId);
  const cancellation = evaluateCancellation(booking);
  return {
    ...presentBooking(booking, { asProvider }),
    ...flags,
    can_pay,
    pay_amount: can_pay ? payableAmount(booking) : 0,
    cancellation_policy: cancellation,
    offer_expires_at: booking.offer_expires_at || null,
    accept_timeout_minutes: ACCEPT_OFFER_TIMEOUT_MINUTES,
    suggestion_response_timeout_minutes: SUGGESTION_RESPONSE_TIMEOUT_MINUTES,
    suggested_caregiver: await loadSuggestedCaregiver(booking),
    chat: await bookingChatService.summaryForBooking(booking, userId),
    bkash_script: bkashConfig.script
  };
};

const toSuggestionCard = (profile) => {
  if (!profile) return null;
  return {
    id: profile.id,
    name: profile.name || null,
    profile_photo: profile.profile_photo || null,
    rating: profile.rating != null ? Number(profile.rating) : null,
    hourly_rate: profile.hourly_rate != null ? Number(profile.hourly_rate) : null,
    experience_years: profile.experience_years != null ? Number(profile.experience_years) : null,
    district: profile.district || null,
    thana: profile.thana || null,
    gender: profile.gender || null,
    provider_type: profile.provider_type || 'CAREGIVER'
  };
};

const loadSuggestedCaregiver = async (booking) => {
  if (!booking?.suggested_provider_id) return null;
  const profile = await getCaregiverProfileById(booking.suggested_provider_id);
  return toSuggestionCard(profile);
};

const suggestionPushData = (booking, card) => ({
  screen: 'suggest_next_caregiver',
  action: 'CONFIRM_NEXT_CAREGIVER',
  show_modal: 'true',
  booking_number: booking.booking_number || '',
  suggested_caregiver_id: card?.id || '',
  suggested_caregiver_name: card?.name || '',
  suggested_caregiver_photo: card?.profile_photo || '',
  suggested_caregiver_rating: card?.rating != null ? String(card.rating) : '',
  suggested_caregiver_hourly_rate: card?.hourly_rate != null ? String(card.hourly_rate) : '',
  suggested_caregiver_district: card?.district || '',
  suggested_caregiver_thana: card?.thana || '',
  suggestion_expires_at: booking.suggestion_expires_at || ''
});

const notifySuggestion = async (booking, card, busyName) => {
  const name = busyName || 'This caregiver';
  await notifySafely({
    userId: booking.user_id,
    title: 'Caregiver is busy',
    body: `${name} is busy. Do you want to select the next caregiver?`,
    type: 'SUGGEST_NEXT_CAREGIVER',
    bookingId: booking.id,
    referenceId: booking.id,
    referenceType: 'booking',
    extraData: suggestionPushData(booking, card)
  }, 'Suggest next caregiver failed');
};

const notifyBookingCancelledForRebook = async (booking, body) => {
  await notifySafely({
    userId: booking.user_id,
    title: 'Booking cancelled',
    body,
    type: 'BOOKING_CANCELLED',
    bookingId: booking.id,
    referenceId: booking.id,
    referenceType: 'booking',
    extraData: {
      screen: 'booking_details',
      action: 'BOOK_AGAIN',
      booking_number: booking.booking_number || ''
    }
  }, 'Cancel-for-rebook notify failed');
};

/**
 * Provider is already cleared. Offer the next caregiver, or cancel so the user can book again.
 */
const suggestNextOrCancel = async (booking, actorId, note, excludedProviderId, busyName) => {
  const next = await findNextCaregiver(booking, [excludedProviderId]);
  if (!next) {
    const reason = 'No other caregiver is available. Please create a new booking.';
    const cancelled = await cancelSearchingBooking(booking.id, reason);
    if (!cancelled) return { skipped: true };
    await addStatusHistory(
      booking.id,
      booking.status,
      STATUSES.CANCELLED_BY_USER,
      actorId,
      note || reason
    );
    await writeAudit({
      actorId,
      action: 'BOOKING_CANCELLED',
      entityType: 'booking',
      entityId: booking.id,
      meta: { reason, status: STATUSES.CANCELLED_BY_USER }
    });
    await notifyBookingCancelledForRebook(
      booking,
      `No other caregiver is available for ${booking.booking_number}. This booking was cancelled. Please create a new booking.`
    );
    return { cancelled: true, booking: cancelled, next: null };
  }

  const attached = await attachSuggestion(
    booking.id,
    next.id,
    SUGGESTION_RESPONSE_TIMEOUT_MINUTES
  );
  if (!attached) return { skipped: true };

  await addStatusHistory(
    booking.id,
    booking.status,
    STATUSES.SEARCHING_PROVIDER,
    actorId,
    note || `Suggested caregiver ${next.id}`
  );

  const card = toSuggestionCard(await getCaregiverProfileById(next.id)) || toSuggestionCard(next);
  await notifySuggestion(
    { ...booking, suggestion_expires_at: attached.suggestion_expires_at },
    card,
    busyName
  );

  return { cancelled: false, booking: attached, next: card };
};

const notifySafely = async (payload, label) => {
  try {
    await notifyUser(payload);
  } catch (err) {
    console.error(`${label}:`, err.message);
  }
};

const createUserBooking = async (userId, body) => {
  const bookFor = assertBookingSubject(body);
  const {
    family_member_id,
    provider_id,
    hospital_id,
    booking_date,
    start_time,
    duration_hours,
    patient_requirements,
    notes,
    service_type = 'HOSPITAL_ASSISTANCE',
    auto_assign = true,
    requested_provider_type = 'CAREGIVER'
  } = body;

  let familyMember = null;
  let patientSnapshot = null;

  if (bookFor === BOOK_FOR_SELF) {
    if (!booking_date || !start_time || !duration_hours) {
      const error = new Error('booking_date, start_time, and duration_hours are required');
      error.statusCode = 400;
      throw error;
    }
    const user = await findUserById(userId);
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      error.code = 'NOT_FOUND';
      throw error;
    }
    patientSnapshot = buildSelfPatientSnapshot(user, body);
  } else {
    if (!family_member_id || !booking_date || !start_time || !duration_hours) {
      const error = new Error('family_member_id, booking_date, start_time, and duration_hours are required');
      error.statusCode = 400;
      throw error;
    }

    familyMember = await findByUserIdAndId(userId, family_member_id);
    if (!familyMember) {
      const error = new Error('Family member not found');
      error.statusCode = 404;
      error.code = 'NOT_FOUND';
      throw error;
    }
    patientSnapshot = buildFamilyPatientSnapshot(familyMember);
  }

  const end_time = new Date(`${booking_date}T${start_time}`);
  end_time.setHours(end_time.getHours() + parseInt(duration_hours, 10));
  const endTimeStr = end_time.toTimeString().slice(0, 5);

  const providerSubtype = String(requested_provider_type || 'CAREGIVER').toUpperCase() === 'NURSE'
    ? 'NURSE'
    : 'CAREGIVER';

  let caregiver = null;
  if (provider_id) {
    caregiver = await getCaregiverProfileById(provider_id);
    if (!caregiver) {
      const error = new Error('Caregiver not found');
      error.statusCode = 404;
      error.code = 'NOT_FOUND';
      throw error;
    }
    const { isEligibleForBooking } = require('../models/CaregiverProfile');
    if (!isEligibleForBooking(caregiver)) {
      const error = new Error('Selected provider is not eligible for booking');
      error.statusCode = 409;
      error.code = 'CONFLICT';
      throw error;
    }
    if (String(caregiver.provider_type || 'CAREGIVER').toUpperCase() !== providerSubtype) {
      const error = new Error(`Selected provider is not a ${providerSubtype}`);
      error.statusCode = 409;
      throw error;
    }
    await assertCaregiverFree(caregiver, {
      booking_date,
      start_time,
      end_time: endTimeStr
    });
  }

  const { PLATFORM_FEE_RATE, CANCEL_FULL_REFUND_HOURS, CANCEL_PARTIAL_REFUND_HOURS, CANCEL_PARTIAL_REFUND_PERCENT } = require('../config/platform');
  const price = calculateBookingPrice({
    serviceType: service_type,
    durationHours: duration_hours,
    hourlyRate: caregiver?.hourly_rate
  });

  const money_rules_snapshot = {
    PLATFORM_FEE_RATE,
    CANCEL_FULL_REFUND_HOURS,
    CANCEL_PARTIAL_REFUND_HOURS,
    CANCEL_PARTIAL_REFUND_PERCENT,
    captured_at: new Date().toISOString()
  };

  const draft = {
    user_id: userId,
    family_member_id: bookFor === BOOK_FOR_SELF ? null : family_member_id,
    book_for: bookFor === BOOK_FOR_SELF ? BOOK_FOR_SELF : BOOK_FOR_FAMILY,
    patient_snapshot: patientSnapshot,
    service_type,
    provider_type: 'CAREGIVER',
    provider_id: caregiver?.id || null,
    hospital_id,
    booking_date,
    start_time,
    end_time: endTimeStr,
    duration_hours,
    patient_requirements,
    notes,
    discount: 0,
    ...price,
    money_rules_snapshot,
    requested_provider_type: providerSubtype,
    status: caregiver ? STATUSES.PROVIDER_ASSIGNED : STATUSES.SEARCHING_PROVIDER
  };

  let booking = await createBooking(draft);

  // Persist subtype hint for assignment when column/json available
  try {
    await pool.query(
      `
      UPDATE bookings
      SET money_rules_snapshot = COALESCE(money_rules_snapshot, '{}'::jsonb) || $2::jsonb,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      `,
      [
        booking.id,
        JSON.stringify({
          ...money_rules_snapshot,
          requested_provider_type: providerSubtype
        })
      ]
    );
  } catch (e) {
    // Column may not exist until migrate:sql — pricing columns still snapshotted on row
  }

  // Auto-offer when no preferred caregiver (or preferred missing / auto_assign)
  if (!caregiver && auto_assign !== false) {
    const matchContext = {
      ...booking,
      family_member_district: familyMember?.district || patientSnapshot?.district || null,
      family_member_thana: familyMember?.thana || patientSnapshot?.thana || null,
      hospital_id,
      requested_provider_type: providerSubtype
    };
    const next = await findNextCaregiver(matchContext);
    if (next) {
      const { assignProvider, addStatusHistory: hist } = require('../models/Booking');
      booking = await assignProvider(booking.id, next.id, STATUSES.PROVIDER_ASSIGNED);
      await hist(
        booking.id,
        STATUSES.SEARCHING_PROVIDER,
        STATUSES.PROVIDER_ASSIGNED,
        userId,
        `Auto-assigned caregiver ${next.id}`
      );
      caregiver = next;
      booking.status = STATUSES.PROVIDER_ASSIGNED;
    }
  } else if (caregiver) {
    const { setOfferExpiry } = require('../models/Booking');
    booking = await setOfferExpiry(booking.id);
    booking.status = STATUSES.PROVIDER_ASSIGNED;
  }

  if (caregiver?.user_id) {
    await notifySafely({
      userId: caregiver.user_id,
      title: 'New Booking Request',
      body: `You have a new booking ${booking.booking_number}. Tap to view details.`,
      type: 'BOOKING_CREATED',
      bookingId: booking.id,
      referenceId: booking.id,
      referenceType: 'booking',
      extraData: {
        booking_number: booking.booking_number,
        screen: 'inbox',
        offer_expires_at: booking.offer_expires_at || null
      }
    }, 'Notify caregiver on booking create failed');
  }

  const detailed = await findById(booking.id);
  return detailed || booking;
};

const acceptBooking = async (bookingId, userId) => {
  const caregiver = await getCaregiverProfileByUserId(userId);
  if (!caregiver) {
    const error = new Error('Caregiver profile not found');
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }

  const client = await pool.connect();
  let updated;
  let oldStatus;
  try {
    await client.query('BEGIN');
    const locked = await client.query(
      `SELECT * FROM bookings WHERE id = $1 FOR UPDATE`,
      [bookingId]
    );
    const booking = locked.rows[0];
    if (!booking) {
      const error = new Error('Booking not found');
      error.statusCode = 404;
      error.code = 'NOT_FOUND';
      throw error;
    }
    if (booking.provider_type !== 'CAREGIVER' || booking.provider_id !== caregiver.id) {
      const error = new Error('Access denied — this booking is not assigned to you');
      error.statusCode = 403;
      throw error;
    }
    if (![STATUSES.SEARCHING_PROVIDER, STATUSES.PROVIDER_ASSIGNED].includes(booking.status)) {
      const error = new Error('Booking cannot be accepted in current status');
      error.statusCode = 400;
      throw error;
    }

    await assertCaregiverFree(caregiver, booking, { excludeBookingId: booking.id });
    assertTransition(booking.status, STATUSES.PROVIDER_ACCEPTED);
    oldStatus = booking.status;

    const result = await client.query(
      `
      UPDATE bookings
      SET status = $1,
          offer_expires_at = NULL,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
        AND status = ANY($3::text[])
        AND provider_id = $4
      RETURNING *
      `,
      [
        STATUSES.PROVIDER_ACCEPTED,
        booking.id,
        [STATUSES.SEARCHING_PROVIDER, STATUSES.PROVIDER_ASSIGNED],
        caregiver.id
      ]
    );
    updated = result.rows[0];
    if (!updated) {
      const error = new Error('Booking was reassigned or already accepted');
      error.statusCode = 409;
      error.code = 'CONFLICT';
      throw error;
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  await addStatusHistory(
    updated.id,
    oldStatus,
    STATUSES.PROVIDER_ACCEPTED,
    userId,
    'Provider accepted booking'
  );

  await notifySafely({
    userId: updated.user_id,
    title: 'Booking Accepted',
    body: `Your booking ${updated.booking_number} was accepted. Tap to view details.`,
    type: 'BOOKING_ACCEPTED',
    bookingId: updated.id,
    referenceId: updated.id,
    referenceType: 'booking',
    extraData: { booking_number: updated.booking_number, screen: 'inbox' }
  }, 'Notify user on accept failed');

  return updated;
};

const rejectBooking = async (bookingId, userId, reason) => {
  const booking = await findById(bookingId);
  if (!booking) {
    const error = new Error('Booking not found');
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }
  if (!(await isAssignedCaregiver(booking, userId))) {
    const error = new Error('Access denied — this booking is not assigned to you');
    error.statusCode = 403;
    throw error;
  }
  if (![STATUSES.SEARCHING_PROVIDER, STATUSES.PROVIDER_ASSIGNED, STATUSES.PROVIDER_ACCEPTED].includes(booking.status)) {
    const error = new Error('Booking cannot be rejected in current status');
    error.statusCode = 400;
    throw error;
  }

  const rejectReason = reason || 'No reason provided';
  await addRejection(booking.id, booking.provider_id, rejectReason);

  const released = await releaseProviderForSuggestion(
    booking.id,
    booking.provider_id,
    [STATUSES.SEARCHING_PROVIDER, STATUSES.PROVIDER_ASSIGNED, STATUSES.PROVIDER_ACCEPTED]
  );
  if (!released) {
    return {
      booking,
      message: 'Offer already closed'
    };
  }

  const result = await suggestNextOrCancel(
    booking,
    userId,
    `Provider rejected: ${rejectReason}`,
    booking.provider_id,
    booking.caregiver_name
  );

  if (result.skipped) {
    return { booking, message: 'Offer already closed' };
  }

  if (result.cancelled) {
    return {
      booking: { ...result.booking, reassigned: false, searching: false, cancelled: true },
      message: 'No other caregiver is available. Booking cancelled.'
    };
  }

  return {
    booking: {
      ...result.booking,
      reassigned: false,
      searching: true,
      awaiting_user: true,
      suggested_caregiver: result.next
    },
    message: 'Caregiver declined. The user will be asked to choose the next caregiver.'
  };
};

const handleOfferTimeout = async (bookingId) => {
  const booking = await findById(bookingId);
  if (!booking || booking.status !== STATUSES.PROVIDER_ASSIGNED || !booking.provider_id) {
    return null;
  }

  const providerId = booking.provider_id;
  const released = await releaseExpiredOffer(booking.id);
  if (!released) return null;
  await addRejection(booking.id, providerId, 'Offer timed out');

  return suggestNextOrCancel(
    booking,
    null,
    'Offer timed out — waiting for the user to choose the next caregiver',
    booking.provider_id,
    booking.caregiver_name
  );
};

const expireUnansweredSuggestions = async () => {
  const { rows } = await pool.query(
    `
    SELECT id
    FROM bookings
    WHERE status = 'SEARCHING_PROVIDER'
      AND suggested_provider_id IS NOT NULL
      AND suggestion_expires_at IS NOT NULL
      AND suggestion_expires_at < NOW()
    ORDER BY suggestion_expires_at ASC
    LIMIT 25
    `
  );

  let processed = 0;
  for (const row of rows) {
    const reason = 'You did not continue with the next caregiver. Please create a new booking.';
    const cancelled = await cancelExpiredSuggestion(row.id, reason);
    if (!cancelled) continue;

    const booking = await findById(row.id);
    await addStatusHistory(
      row.id,
      STATUSES.SEARCHING_PROVIDER,
      STATUSES.CANCELLED_BY_USER,
      null,
      reason
    );
    await writeAudit({
      actorId: null,
      action: 'BOOKING_CANCELLED',
      entityType: 'booking',
      entityId: row.id,
      meta: { reason, status: STATUSES.CANCELLED_BY_USER }
    });
    if (booking) {
      await notifyBookingCancelledForRebook(
        booking,
        `Booking ${booking.booking_number} was cancelled because you did not continue. Please create a new booking.`
      );
    }
    processed += 1;
  }
  return processed;
};

const acceptNextCaregiver = async (bookingId, userId) => {
  const booking = await findById(bookingId);
  if (!booking) {
    const error = new Error('Booking not found');
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }
  if (booking.user_id !== userId) {
    const error = new Error('Access denied');
    error.statusCode = 403;
    throw error;
  }
  if (booking.status !== STATUSES.SEARCHING_PROVIDER || !booking.suggested_provider_id) {
    const error = new Error('There is no caregiver suggestion to continue');
    error.statusCode = 400;
    throw error;
  }

  if (booking.suggestion_expires_at && new Date(booking.suggestion_expires_at).getTime() < Date.now()) {
    const reason = 'You did not continue with the next caregiver. Please create a new booking.';
    const cancelled = await cancelExpiredSuggestion(booking.id, reason);
    if (cancelled) {
      await addStatusHistory(booking.id, booking.status, STATUSES.CANCELLED_BY_USER, userId, reason);
      await notifyBookingCancelledForRebook(
        booking,
        `Booking ${booking.booking_number} was cancelled because you did not continue. Please create a new booking.`
      );
    }
    const error = new Error('This suggestion expired. The booking was cancelled. Please create a new booking.');
    error.statusCode = 400;
    throw error;
  }

  const caregiver = await getCaregiverProfileById(booking.suggested_provider_id);
  if (!caregiver) {
    const error = new Error('Suggested caregiver was not found');
    error.statusCode = 404;
    throw error;
  }

  try {
    await assertCaregiverFree(caregiver, booking, { excludeBookingId: booking.id });
  } catch (err) {
    if (err.statusCode !== 409) throw err;
    await addRejection(booking.id, caregiver.id, 'Unavailable when user confirmed');
    const cleared = await clearSuggestion(booking.id, caregiver.id);
    if (!cleared) {
      const error = new Error('This suggestion is no longer available');
      error.statusCode = 409;
      error.code = 'CONFLICT';
      throw error;
    }
    const refreshed = await findById(booking.id);
    const rotated = await suggestNextOrCancel(
      refreshed,
      userId,
      'Suggested caregiver became unavailable',
      caregiver.id,
      caregiver.name
    );
    const latest = await findById(booking.id);
    return {
      booking: await withJourney(latest, userId),
      message: rotated.cancelled
        ? 'No other caregiver is available. This booking was cancelled. Please create a new booking.'
        : 'That caregiver is no longer available. Please confirm the next caregiver.'
    };
  }

  const claimed = await claimSuggestion(
    booking.id,
    userId,
    caregiver.id,
    ACCEPT_OFFER_TIMEOUT_MINUTES
  );
  if (!claimed) {
    const error = new Error('This suggestion is no longer available');
    error.statusCode = 409;
    error.code = 'CONFLICT';
    throw error;
  }

  await addStatusHistory(
    booking.id,
    STATUSES.SEARCHING_PROVIDER,
    STATUSES.PROVIDER_ASSIGNED,
    userId,
    `User continued with caregiver ${caregiver.id}`
  );

  await notifySafely({
    userId: caregiver.user_id,
    title: 'New Booking Request',
    body: `You have a new booking ${booking.booking_number}. Accept within ${ACCEPT_OFFER_TIMEOUT_MINUTES} minutes.`,
    type: 'BOOKING_CREATED',
    bookingId: booking.id,
    referenceId: booking.id,
    referenceType: 'booking',
    extraData: {
      booking_number: booking.booking_number,
      screen: 'booking_details',
      offer_expires_at: claimed.offer_expires_at || ''
    }
  }, 'Notify suggested caregiver failed');

  const latest = await findById(booking.id);
  return {
    booking: await withJourney(latest, userId),
    message: `Request sent to ${caregiver.name || 'the next caregiver'}. They have ${ACCEPT_OFFER_TIMEOUT_MINUTES} minutes to accept.`
  };
};

const declineNextCaregiver = async (bookingId, userId) => {
  const booking = await findById(bookingId);
  if (!booking) {
    const error = new Error('Booking not found');
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }
  if (booking.user_id !== userId) {
    const error = new Error('Access denied');
    error.statusCode = 403;
    throw error;
  }
  if (booking.status !== STATUSES.SEARCHING_PROVIDER || !booking.suggested_provider_id) {
    const error = new Error('There is no caregiver suggestion to decline');
    error.statusCode = 400;
    throw error;
  }

  const reason = 'User declined the next caregiver';
  const cancelled = await cancelSearchingBooking(booking.id, reason, { requireSuggestion: true });
  if (!cancelled) {
    const error = new Error('This suggestion is no longer available');
    error.statusCode = 409;
    error.code = 'CONFLICT';
    throw error;
  }

  await addStatusHistory(booking.id, booking.status, STATUSES.CANCELLED_BY_USER, userId, reason);
  await writeAudit({
    actorId: userId,
    action: 'BOOKING_CANCELLED',
    entityType: 'booking',
    entityId: booking.id,
    meta: { reason, status: STATUSES.CANCELLED_BY_USER }
  });
  await notifyBookingCancelledForRebook(
    booking,
    `Booking ${booking.booking_number} was cancelled. You can create a new booking whenever you are ready.`
  );

  const latest = await findById(booking.id);
  return {
    booking: await withJourney(latest, userId),
    message: 'Booking cancelled. You can create a new booking.'
  };
};

const cancelBooking = async (booking, user, reason) => {
  const asProvider = await isAssignedCaregiver(booking, user.id);
  const isAdmin = user.role === 'ADMIN';
  if (booking.user_id !== user.id && !asProvider && !isAdmin) {
    const error = new Error('Access denied');
    error.statusCode = 403;
    throw error;
  }

  const policy = evaluateCancellation(booking, { byAdmin: isAdmin });
  if (!policy.canCancel) {
    const error = new Error(policy.message || 'Cannot cancel this booking');
    error.statusCode = 400;
    throw error;
  }

  if (asProvider && !isAdmin && ['PAYMENT_PAID', 'SERVICE_IN_PROGRESS'].includes(booking.status)) {
    const error = new Error('Paid bookings can only be cancelled by the user or admin');
    error.statusCode = 400;
    throw error;
  }

  const cancelStatus = isAdmin
    ? STATUSES.CANCELLED_BY_ADMIN
    : (booking.user_id === user.id ? STATUSES.CANCELLED_BY_USER : STATUSES.CANCELLED_BY_PROVIDER);

  assertTransition(booking.status, cancelStatus);
  const oldStatus = booking.status;
  const updated = await cancel(booking.id, reason, cancelStatus);
  await addStatusHistory(booking.id, oldStatus, cancelStatus, user.id, reason);
  if (oldStatus === STATUSES.SERVICE_IN_PROGRESS) {
    await bookingChatService.purgeForBooking(booking, cancelStatus);
  }

  let refund = { skipped: true };
  if (policy.refundAmount > 0) {
    try {
      refund = await processBookingRefund(booking, {
        refundAmount: policy.refundAmount,
        reason: reason || 'Booking cancelled'
      });
    } catch (refundErr) {
      console.error('Cancel refund failed:', refundErr.message);
      refund = { skipped: false, failed: true, message: refundErr.message };
    }
  }

  await writeAudit({
    actorId: user.id,
    action: 'BOOKING_CANCELLED',
    entityType: 'booking',
    entityId: booking.id,
    meta: { status: cancelStatus, policy, refund_skipped: refund.skipped }
  });

  const notifyTarget = booking.user_id === user.id
    ? (await getCaregiverProfileById(booking.provider_id))?.user_id
    : booking.user_id;

  if (notifyTarget) {
    await notifySafely({
      userId: notifyTarget,
      title: 'Booking Cancelled',
      body: `Booking ${booking.booking_number} was cancelled.`,
      type: 'BOOKING_CANCELLED',
      bookingId: booking.id,
      referenceId: booking.id,
      referenceType: 'booking',
      extraData: { screen: 'inbox' }
    }, 'Cancel notify failed');
  }

  return { updated, policy, refund };
};

const startBooking = async (bookingId, userId, location = {}) => {
  const booking = await findById(bookingId);
  if (!booking) {
    const error = new Error('Booking not found');
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }
  if (!(await isAssignedCaregiver(booking, userId))) {
    const error = new Error('Access denied — this booking is not assigned to you');
    error.statusCode = 403;
    throw error;
  }
  if (booking.status !== 'PAYMENT_PAID') {
    const error = new Error('Service can only be started after the user has paid');
    error.statusCode = 400;
    throw error;
  }

  const scheduledStart = getScheduledStartAt(booking);
  const scheduledEnd = getScheduledEndAt(booking);
  if (scheduledStart && !isInstantReached(scheduledStart)) {
    const error = new Error('Service can only be started when the scheduled time arrives');
    error.statusCode = 400;
    throw error;
  }
  if (scheduledEnd && isInstantReached(scheduledEnd)) {
    const error = new Error('The booked time has passed. Tell us why the service was not started.');
    error.statusCode = 400;
    throw error;
  }

  const latitude = location.latitude ?? location.lat;
  const longitude = location.longitude ?? location.lng ?? location.long;
  if (latitude == null || longitude == null || latitude === '' || longitude === '') {
    const error = new Error('latitude and longitude are required to start service (for live tracking)');
    error.statusCode = 400;
    throw error;
  }

  assertTransition(booking.status, STATUSES.SERVICE_IN_PROGRESS);
  const oldStatus = booking.status;
  await startService(booking.id);
  await addStatusHistory(
    booking.id,
    oldStatus,
    'SERVICE_IN_PROGRESS',
    userId,
    'Caregiver started service',
    Number(latitude),
    Number(longitude)
  );

  const liveTrackingService = require('./liveTrackingService');
  const { emitLocation } = require('../realtime/socket');
  let liveLocation = null;
  try {
    liveLocation = await liveTrackingService.publishLocation(booking.id, userId, {
      latitude,
      longitude,
      accuracy: location.accuracy,
      heading: location.heading,
      speed: location.speed
    });
    emitLocation(booking.id, liveLocation);
  } catch (locErr) {
    console.error('Initial live location save failed:', locErr.message);
  }

  await notifySafely({
    userId: booking.user_id,
    title: 'Service Started',
    body: `Caregiver started booking ${booking.booking_number}. Live tracking and chat are available.`,
    type: 'SERVICE_STARTED',
    bookingId: booking.id,
    referenceId: booking.id,
    referenceType: 'booking',
    extraData: {
      booking_number: booking.booking_number,
      status: 'SERVICE_IN_PROGRESS',
      action: 'OPEN_LIVE_TRACKING',
      screen: 'live_tracking',
      live_tracking: 'true',
      chat_available: 'true'
    }
  }, 'Notify user on start failed');

  const payload = await withJourney(await findById(booking.id), userId);
  return { ...payload, live_location: liveLocation };
};

const completeBooking = async (bookingId, userId) => {
  const booking = await findById(bookingId);
  if (!booking) {
    const error = new Error('Booking not found');
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }
  if (!(await isAssignedCaregiver(booking, userId))) {
    const error = new Error('Access denied — this booking is not assigned to you');
    error.statusCode = 403;
    throw error;
  }
  if (booking.status !== 'SERVICE_IN_PROGRESS') {
    const error = new Error('Service can only be completed after it has started');
    error.statusCode = 400;
    throw error;
  }

  const scheduledEnd = getScheduledEndAt(booking);
  if (scheduledEnd && !isInstantReached(scheduledEnd)) {
    const error = new Error('Service can only be ended after the booked time has passed');
    error.statusCode = 400;
    throw error;
  }

  assertTransition(booking.status, STATUSES.SERVICE_COMPLETED);
  const oldStatus = booking.status;
  await complete(booking.id);
  const settled = await settleEarning(booking.id);
  await addStatusHistory(booking.id, oldStatus, 'SERVICE_COMPLETED', userId, 'Caregiver ended service');

  const liveTrackingService = require('./liveTrackingService');
  const { emitTrackingEnded } = require('../realtime/socket');
  try {
    await liveTrackingService.stopTracking(booking.id);
    emitTrackingEnded(booking.id);
  } catch (trackErr) {
    console.error('Stop live tracking failed:', trackErr.message);
  }
  await bookingChatService.purgeForBooking(booking, 'SERVICE_COMPLETED');

  if (booking.provider_type === 'CAREGIVER' && booking.provider_id) {
    try {
      await incrementCompletedBookings(booking.provider_id);
    } catch (countErr) {
      console.error('Increment completed bookings failed:', countErr.message);
    }
  }

  const caregiverEarning = await getCaregiverEarningForBooking(booking.id);

  await notifySafely({
    userId: booking.user_id,
    title: 'Service Completed',
    body: `Booking ${booking.booking_number} has ended. Tap to view details.`,
    type: 'SERVICE_COMPLETED',
    bookingId: booking.id,
    referenceId: booking.id,
    referenceType: 'booking',
    extraData: {
      booking_number: booking.booking_number,
      status: 'SERVICE_COMPLETED',
      action: 'OPEN_BOOKING',
      screen: 'booking_details',
      show_review: 'true',
      live_tracking: 'false'
    }
  }, 'Notify user on complete failed');

  const caregiver = await getCaregiverProfileById(booking.provider_id);
  if (caregiver?.user_id) {
    const amountText = caregiverEarning != null ? ` BDT ${caregiverEarning}` : '';
    await notifySafely({
      userId: caregiver.user_id,
      title: 'Earning settled to wallet',
      body: `Service completed for ${booking.booking_number}.${amountText} is now in your wallet.`,
      type: 'EARNING_SETTLED',
      bookingId: booking.id,
      referenceId: booking.id,
      referenceType: 'booking',
      extraData: {
        booking_number: booking.booking_number,
        status: 'SERVICE_COMPLETED',
        payout_status: 'SETTLED_TO_WALLET',
        caregiver_earning: String(caregiverEarning || ''),
        action: 'OPEN_WALLET',
        screen: 'wallet'
      }
    }, 'Notify caregiver on settle failed');
  }

  const payload = await withJourney(await findById(booking.id), userId);
  return {
    ...payload,
    earning_settled: !!settled?.earning_settled_at,
    caregiver_earning: caregiverEarning
  };
};

const reportNoStart = async (bookingId, userId, { reason, is_emergency } = {}) => {
  const booking = await findById(bookingId);
  if (!booking) {
    const error = new Error('Booking not found');
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }
  if (!(await isAssignedCaregiver(booking, userId))) {
    const error = new Error('Access denied — this booking is not assigned to you');
    error.statusCode = 403;
    throw error;
  }
  if (booking.status !== STATUSES.PAYMENT_PAID) {
    const error = new Error('A reason can only be sent when the service was not started');
    error.statusCode = 400;
    throw error;
  }

  const scheduledEnd = getScheduledEndAt(booking);
  if (!scheduledEnd || !isInstantReached(scheduledEnd)) {
    const error = new Error('The booked time has not ended yet');
    error.statusCode = 400;
    throw error;
  }
  if (booking.no_start_reported_at) {
    const error = new Error('You already sent a reason');
    error.statusCode = 409;
    error.code = 'CONFLICT';
    throw error;
  }

  const text = String(reason || '').trim();
  if (!text) {
    const error = new Error('reason is required');
    error.statusCode = 400;
    throw error;
  }
  if (text.length > 500) {
    const error = new Error('reason must be 500 characters or less');
    error.statusCode = 400;
    throw error;
  }

  const isEmergency = is_emergency === true || is_emergency === 'true';
  const caregiver = await getCaregiverProfileByUserId(userId);
  const saved = await saveNoStartReport(booking.id, booking.provider_id, text, isEmergency);
  if (!saved) {
    const error = new Error('You already sent a reason');
    error.statusCode = 409;
    error.code = 'CONFLICT';
    throw error;
  }

  const caregiverName = caregiver?.name || booking.caregiver_name || 'Your caregiver';
  await notifySafely({
    userId: booking.user_id,
    title: isEmergency ? 'Caregiver emergency' : 'Service was not started',
    body: isEmergency
      ? `${caregiverName} could not start booking ${booking.booking_number}. Emergency: ${text}`
      : `${caregiverName} did not start booking ${booking.booking_number}. Reason: ${text}`,
    type: isEmergency ? 'SERVICE_NOT_STARTED_EMERGENCY' : 'SERVICE_NOT_STARTED_REASON',
    bookingId: booking.id,
    referenceId: booking.id,
    referenceType: 'booking',
    extraData: {
      booking_number: booking.booking_number,
      screen: 'booking_details',
      is_emergency: String(isEmergency),
      reason: text,
      action: 'OPEN_BOOKING'
    }
  }, 'Notify user of missed start failed');

  return {
    id: booking.id,
    booking_number: booking.booking_number,
    no_start_reason: text,
    no_start_is_emergency: isEmergency,
    no_start_reported_at: saved.no_start_reported_at
  };
};

const submitReview = async (bookingId, userId, { rating, comment }) => {
  const ratingNum = Number(rating);
  if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
    const error = new Error('rating must be an integer from 1 to 5');
    error.statusCode = 400;
    throw error;
  }

  const booking = await findById(bookingId);
  if (!booking) {
    const error = new Error('Booking not found');
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }
  if (booking.user_id !== userId) {
    const error = new Error('Only the booking user can submit a review');
    error.statusCode = 403;
    throw error;
  }
  if (booking.status !== 'SERVICE_COMPLETED') {
    const error = new Error('Review is allowed only after the caregiver ends the service');
    error.statusCode = 400;
    throw error;
  }
  if (booking.provider_type !== 'CAREGIVER' || !booking.provider_id) {
    const error = new Error('This booking has no caregiver to review');
    error.statusCode = 400;
    throw error;
  }

  const existing = await Review.findByBookingId(booking.id);
  if (existing) {
    const error = new Error('You have already submitted a review for this booking');
    error.statusCode = 400;
    throw error;
  }

  try {
    await Review.createReview({
      booking_id: booking.id,
      user_id: userId,
      caregiver_profile_id: booking.provider_id,
      rating: ratingNum,
      comment: comment ? String(comment).trim() : null
    });
  } catch (createErr) {
    if (createErr.code === '23505') {
      const error = new Error('You have already submitted a review for this booking');
      error.statusCode = 400;
      throw error;
    }
    throw createErr;
  }

  const stats = await Review.averageRatingForCaregiver(booking.provider_id);
  await updateRating(booking.provider_id, stats.avg_rating);
  invalidateCaregiverCatalog();

  const caregiver = await getCaregiverProfileById(booking.provider_id);
  if (caregiver?.user_id) {
    const stars = '★'.repeat(ratingNum) + '☆'.repeat(5 - ratingNum);
    await notifySafely({
      userId: caregiver.user_id,
      title: 'New rating received',
      body: `You received ${ratingNum} star${ratingNum === 1 ? '' : 's'} for booking ${booking.booking_number}. ${stars}`,
      type: 'REVIEW_RECEIVED',
      bookingId: booking.id,
      referenceId: booking.id,
      referenceType: 'booking',
      extraData: {
        booking_number: booking.booking_number,
        rating: String(ratingNum),
        status: 'SERVICE_COMPLETED',
        action: 'OPEN_BOOKING',
        screen: 'booking_details'
      }
    }, 'Notify caregiver on review failed');
  }

  const payload = await withJourney(await findById(booking.id), userId);
  return {
    ...payload,
    caregiver_rating: stats.avg_rating,
    review_count: stats.total
  };
};

const createDispute = async (bookingId, user, { reason, details }) => {
  if (!reason) {
    const error = new Error('reason is required');
    error.statusCode = 400;
    throw error;
  }

  const booking = await findById(bookingId);
  if (!booking) {
    const error = new Error('Booking not found');
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }

  const asProvider = await isAssignedCaregiver(booking, user.id);
  if (booking.user_id !== user.id && !asProvider) {
    const error = new Error('Access denied');
    error.statusCode = 403;
    throw error;
  }

  if (!['PAYMENT_PAID', 'SERVICE_IN_PROGRESS', 'SERVICE_COMPLETED'].includes(booking.status)) {
    const error = new Error('Dispute is allowed only after payment');
    error.statusCode = 400;
    throw error;
  }

  const existing = await Dispute.findOpenByBookingId(booking.id);
  if (existing) {
    const error = new Error('An open dispute already exists for this booking');
    error.statusCode = 409;
    error.code = 'CONFLICT';
    throw error;
  }

  const dispute = await Dispute.createDispute({
    bookingId: booking.id,
    raisedBy: user.id,
    role: asProvider ? 'CAREGIVER' : 'USER',
    reason,
    details
  });

  await writeAudit({
    actorId: user.id,
    action: 'DISPUTE_CREATED',
    entityType: 'dispute',
    entityId: dispute.id,
    meta: { booking_id: booking.id, reason }
  });

  const notifyTarget = asProvider
    ? booking.user_id
    : (await getCaregiverProfileById(booking.provider_id))?.user_id;
  if (notifyTarget) {
    await notifySafely({
      userId: notifyTarget,
      title: 'New dispute',
      body: `A dispute was opened for booking ${booking.booking_number}.`,
      type: 'DISPUTE_UPDATED',
      bookingId: booking.id,
      referenceId: dispute.id,
      referenceType: 'dispute',
      extraData: { screen: 'inbox' }
    }, 'Dispute notify failed');
  }

  return dispute;
};

module.exports = {
  resolveCaregiverProfileId,
  isAssignedCaregiver,
  withJourney,
  createUserBooking,
  acceptBooking,
  rejectBooking,
  handleOfferTimeout,
  expireUnansweredSuggestions,
  acceptNextCaregiver,
  declineNextCaregiver,
  cancelBooking,
  startBooking,
  completeBooking,
  reportNoStart,
  submitReview,
  createDispute
};
