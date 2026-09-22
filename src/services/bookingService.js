const {
  createBooking,
  findById,
  updateStatus,
  clearOfferExpiry,
  addStatusHistory,
  addRejection,
  startService,
  complete,
  settleEarning,
  cancel
} = require('../models/Booking');
const { findByUserIdAndId } = require('../models/FamilyMember');
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
  assertTransition
} = require('./bookingJourney');
const { getCaregiverEarningForBooking } = require('./walletService');
const { calculateBookingPrice } = require('./pricingService');
const { assertCaregiverFree, reassignOrSearch, findNextCaregiver } = require('./bookingAssignment');
const { evaluateCancellation } = require('./cancellationPolicy');
const { processBookingRefund } = require('./refundService');
const { writeAudit } = require('../utils/audit');
const { ACCEPT_OFFER_TIMEOUT_MINUTES } = require('../config/platform');

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
    bkash_script: bkashConfig.script
  };
};

const notifySafely = async (payload, label) => {
  try {
    await notifyUser(payload);
  } catch (err) {
    console.error(`${label}:`, err.message);
  }
};

const createUserBooking = async (userId, body) => {
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
    auto_assign = true
  } = body;

  if (!family_member_id || !booking_date || !start_time || !duration_hours) {
    const error = new Error('family_member_id, booking_date, start_time, and duration_hours are required');
    error.statusCode = 400;
    throw error;
  }

  const familyMember = await findByUserIdAndId(userId, family_member_id);
  if (!familyMember) {
    const error = new Error('Family member not found');
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }

  const end_time = new Date(`${booking_date}T${start_time}`);
  end_time.setHours(end_time.getHours() + parseInt(duration_hours, 10));
  const endTimeStr = end_time.toTimeString().slice(0, 5);

  let caregiver = null;
  if (provider_id) {
    caregiver = await getCaregiverProfileById(provider_id);
    if (!caregiver) {
      const error = new Error('Caregiver not found');
      error.statusCode = 404;
      error.code = 'NOT_FOUND';
      throw error;
    }
    await assertCaregiverFree(caregiver, {
      booking_date,
      start_time,
      end_time: endTimeStr
    });
  }

  const price = calculateBookingPrice({
    serviceType: service_type,
    durationHours: duration_hours,
    hourlyRate: caregiver?.hourly_rate
  });

  const draft = {
    user_id: userId,
    family_member_id,
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
    status: caregiver ? STATUSES.PROVIDER_ASSIGNED : STATUSES.SEARCHING_PROVIDER
  };

  let booking = await createBooking(draft);

  // Auto-offer when no preferred caregiver (or preferred missing / auto_assign)
  if (!caregiver && auto_assign !== false) {
    const matchContext = {
      ...booking,
      family_member_district: familyMember.district,
      family_member_thana: familyMember.thana,
      hospital_id
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

  return booking;
};

const acceptBooking = async (bookingId, userId) => {
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
  if (![STATUSES.SEARCHING_PROVIDER, STATUSES.PROVIDER_ASSIGNED].includes(booking.status)) {
    const error = new Error('Booking cannot be accepted in current status');
    error.statusCode = 400;
    throw error;
  }

  const caregiver = await getCaregiverProfileByUserId(userId);
  await assertCaregiverFree(caregiver, booking, { excludeBookingId: booking.id });

  assertTransition(booking.status, STATUSES.PROVIDER_ACCEPTED);
  const oldStatus = booking.status;
  let updated = await updateStatus(booking.id, STATUSES.PROVIDER_ACCEPTED);
  updated = await clearOfferExpiry(booking.id);
  await addStatusHistory(booking.id, oldStatus, STATUSES.PROVIDER_ACCEPTED, userId, 'Provider accepted booking');

  await notifySafely({
    userId: booking.user_id,
    title: 'Booking Accepted',
    body: `Your booking ${booking.booking_number} was accepted. Tap to view details.`,
    type: 'BOOKING_ACCEPTED',
    bookingId: booking.id,
    referenceId: booking.id,
    referenceType: 'booking',
    extraData: { booking_number: booking.booking_number, screen: 'inbox' }
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

  const result = await reassignOrSearch(
    booking,
    userId,
    `Provider rejected: ${rejectReason}`
  );

  if (result.next) {
    await notifySafely({
      userId: result.next.user_id,
      title: 'New Booking Request',
      body: `You have a new booking ${booking.booking_number}. Tap to view details.`,
      type: 'BOOKING_CREATED',
      bookingId: booking.id,
      referenceId: booking.id,
      referenceType: 'booking',
      extraData: { booking_number: booking.booking_number, screen: 'inbox' }
    }, 'Notify next caregiver failed');

    await notifySafely({
      userId: booking.user_id,
      title: 'Caregiver changed',
      body: `Your booking ${booking.booking_number} was reassigned to another caregiver.`,
      type: 'BOOKING_REASSIGNED',
      bookingId: booking.id,
      referenceId: booking.id,
      referenceType: 'booking',
      extraData: { screen: 'inbox' }
    }, 'Notify user on reassign failed');

    return {
      booking: { ...result.booking, reassigned: true, searching: false },
      message: 'Booking reassigned to another caregiver'
    };
  }

  await notifySafely({
    userId: booking.user_id,
    title: 'Looking for another caregiver',
    body: `The previous caregiver declined ${booking.booking_number}. We are searching for another caregiver.`,
    type: 'BOOKING_REJECTED',
    bookingId: booking.id,
    referenceId: booking.id,
    referenceType: 'booking',
    extraData: { reason: rejectReason, screen: 'inbox' }
  }, 'Notify user on search failed');

  return {
    booking: { ...result.booking, reassigned: false, searching: true },
    message: 'Caregiver declined. Searching for another caregiver'
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
    body: `Caregiver started booking ${booking.booking_number}. Live tracking is available.`,
    type: 'SERVICE_STARTED',
    bookingId: booking.id,
    referenceId: booking.id,
    referenceType: 'booking',
    extraData: {
      booking_number: booking.booking_number,
      status: 'SERVICE_IN_PROGRESS',
      action: 'OPEN_LIVE_TRACKING',
      screen: 'live_tracking',
      live_tracking: 'true'
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
  cancelBooking,
  startBooking,
  completeBooking,
  submitReview,
  createDispute
};
