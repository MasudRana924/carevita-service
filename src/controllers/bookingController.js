const {
  createBooking,
  findById,
  findByUserId,
  updateStatus,
  clearProvider,
  cancel,
  startService,
  complete,
  settleEarning,
  addStatusHistory,
  getStatusHistory
} = require('../models/Booking');
const { findByUserIdAndId } = require('../models/FamilyMember');
const {
  getCaregiverProfileByUserId,
  getCaregiverProfileById,
  updateRating,
  incrementCompletedBookings
} = require('../models/CaregiverProfile');
const Review = require('../models/Review');
const { notifyUser } = require('../services/pushNotificationService');
const {
  canUserPayBooking,
  payableAmount
} = require('../services/paymentEligibility');
const { bkashConfig } = require('../services/bkashService');
const { journeyFlags } = require('../services/bookingJourney');
const { getCaregiverEarningForBooking } = require('../services/walletService');

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
  return {
    ...booking,
    ...flags,
    can_pay,
    pay_amount: can_pay ? payableAmount(booking) : 0,
    bkash_script: bkashConfig.script
  };
};

exports.createBooking = async (req, res) => {
  try {
    const {
      family_member_id,
      provider_id,
      hospital_id,
      booking_date,
      start_time,
      duration_hours,
      patient_requirements,
      notes,
      service_type = 'HOSPITAL_ASSISTANCE'
    } = req.body;

    if (!family_member_id || !provider_id || !booking_date || !start_time || !duration_hours) {
      return res.error('family_member_id, provider_id, booking_date, start_time, and duration_hours are required');
    }

    const familyMember = await findByUserIdAndId(req.user.id, family_member_id);
    if (!familyMember) {
      return res.notFound('Family member not found');
    }

    const caregiver = await getCaregiverProfileById(provider_id);
    if (!caregiver) {
      return res.notFound('Caregiver not found');
    }

    const end_time = new Date(`${booking_date}T${start_time}`);
    end_time.setHours(end_time.getHours() + parseInt(duration_hours));

    const basePrice = service_type === 'HOSPITAL_ASSISTANCE' ? 300 : 500;
    const hourlyRate = Number(caregiver.hourly_rate) || 250;
    const service_charge = basePrice + hourlyRate * parseInt(duration_hours);
    // Platform takes 5% of service charge
    const platform_fee = Number((service_charge * 0.05).toFixed(2));
    const total_amount = service_charge + platform_fee;
    const advance_percentage = 50;
    const advance_amount = total_amount * (advance_percentage / 100);
    const remaining_amount = total_amount - advance_amount;

    const booking = await createBooking({
      user_id: req.user.id,
      family_member_id,
      service_type,
      provider_type: 'CAREGIVER',
      provider_id,
      hospital_id,
      booking_date,
      start_time,
      end_time: end_time.toTimeString().slice(0, 5),
      duration_hours,
      patient_requirements,
      notes,
      service_charge,
      platform_fee,
      discount: 0,
      total_amount,
      advance_percentage,
      advance_amount,
      remaining_amount
    });

    // Ready for caregiver accept
    await updateStatus(booking.id, 'PROVIDER_ASSIGNED');
    booking.status = 'PROVIDER_ASSIGNED';

    // Push + inbox for caregiver
    try {
      await notifyUser({
        userId: caregiver.user_id,
        title: 'New Booking Request',
        body: `You have a new booking ${booking.booking_number}. Tap to view details.`,
        type: 'BOOKING_CREATED',
        bookingId: booking.id,
        referenceId: booking.id,
        referenceType: 'booking',
        extraData: {
          booking_number: booking.booking_number,
          screen: 'inbox'
        }
      });
    } catch (notifyErr) {
      console.error('Notify caregiver on booking create failed:', notifyErr.message);
    }

    res.created(booking, 'Booking created successfully');
  } catch (error) {
    console.error('Create booking error:', error);
    res.serverError('Failed to create booking');
  }
};

exports.getBookings = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const bookings = await findByUserId(req.user.id, {
      status,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    const data = await Promise.all(
      bookings.map(async (booking) => {
        const review = await Review.findByBookingId(booking.id);
        return {
          ...booking,
          ...journeyFlags(booking, {
            userId: req.user.id,
            asProvider: false,
            review
          })
        };
      })
    );

    res.success(data, null, {
      page: parseInt(page),
      limit: parseInt(limit),
      total: data.length
    });
  } catch (error) {
    console.error('Get bookings error:', error);
    res.serverError('Failed to fetch bookings');
  }
};

exports.getBooking = async (req, res) => {
  try {
    const booking = await findById(req.params.id);
    if (!booking) return res.notFound('Booking not found');

    const asProvider = await isAssignedCaregiver(booking, req.user.id);
    if (booking.user_id !== req.user.id && !asProvider && req.user.role !== 'ADMIN') {
      return res.forbidden('Access denied');
    }

    const history = await getStatusHistory(req.params.id);
    const payload = await withJourney(booking, req.user.id);
    res.success({
      ...payload,
      history
    });
  } catch (error) {
    console.error('Get booking error:', error);
    res.serverError('Failed to fetch booking');
  }
};

exports.acceptBooking = async (req, res) => {
  try {
    const booking = await findById(req.params.id);
    if (!booking) return res.notFound('Booking not found');

    if (!(await isAssignedCaregiver(booking, req.user.id))) {
      return res.forbidden('Access denied — this booking is not assigned to you');
    }

    if (!['SEARCHING_PROVIDER', 'PROVIDER_ASSIGNED'].includes(booking.status)) {
      return res.error('Booking cannot be accepted in current status');
    }

    const oldStatus = booking.status;
    const updated = await updateStatus(booking.id, 'PROVIDER_ACCEPTED');
    await addStatusHistory(booking.id, oldStatus, 'PROVIDER_ACCEPTED', req.user.id, 'Provider accepted booking');

    try {
      await notifyUser({
        userId: booking.user_id,
        title: 'Booking Accepted',
        body: `Your booking ${booking.booking_number} was accepted. Tap to view details.`,
        type: 'BOOKING_ACCEPTED',
        bookingId: booking.id,
        referenceId: booking.id,
        referenceType: 'booking',
        extraData: {
          booking_number: booking.booking_number,
          screen: 'inbox'
        }
      });
    } catch (notifyErr) {
      console.error('Notify user on accept failed:', notifyErr.message);
    }

    res.success(updated, 'Booking accepted successfully');
  } catch (error) {
    console.error('Accept booking error:', error);
    res.serverError('Failed to accept booking');
  }
};

exports.rejectBooking = async (req, res) => {
  try {
    const { reason } = req.body;
    const booking = await findById(req.params.id);
    if (!booking) return res.notFound('Booking not found');

    if (!(await isAssignedCaregiver(booking, req.user.id))) {
      return res.forbidden('Access denied — this booking is not assigned to you');
    }

    if (!['SEARCHING_PROVIDER', 'PROVIDER_ASSIGNED', 'PROVIDER_ACCEPTED'].includes(booking.status)) {
      return res.error('Booking cannot be rejected in current status');
    }

    const oldStatus = booking.status;
    const rejectReason = reason || 'No reason provided';
    const updated = await clearProvider(booking.id, 'CANCELLED_BY_PROVIDER');
    await addStatusHistory(booking.id, oldStatus, 'CANCELLED_BY_PROVIDER', req.user.id, `Provider rejected: ${rejectReason}`);

    try {
      await notifyUser({
        userId: booking.user_id,
        title: 'Booking Rejected',
        body: `Your booking ${booking.booking_number} was rejected. Reason: ${rejectReason}`,
        type: 'BOOKING_REJECTED',
        bookingId: booking.id,
        referenceId: booking.id,
        referenceType: 'booking',
        extraData: { reason: rejectReason, screen: 'inbox' }
      });
    } catch (notifyErr) {
      console.error('Notify user on reject failed:', notifyErr.message);
    }

    res.success(updated, 'Booking rejected successfully');
  } catch (error) {
    console.error('Reject booking error:', error);
    res.serverError('Failed to reject booking');
  }
};

exports.cancelBooking = async (req, res) => {
  try {
    const { reason } = req.body;
    const booking = await findById(req.params.id);
    if (!booking) return res.notFound('Booking not found');

    const asProvider = await isAssignedCaregiver(booking, req.user.id);
    if (booking.user_id !== req.user.id && !asProvider) {
      return res.forbidden('Access denied');
    }

    if (['SERVICE_COMPLETED', 'CANCELLED_BY_USER', 'CANCELLED_BY_PROVIDER'].includes(booking.status)) {
      return res.error('Cannot cancel this booking');
    }

    const cancelStatus = booking.user_id === req.user.id ? 'CANCELLED_BY_USER' : 'CANCELLED_BY_PROVIDER';
    const oldStatus = booking.status;
    const updated = await cancel(booking.id, reason, cancelStatus);
    await addStatusHistory(booking.id, oldStatus, cancelStatus, req.user.id, reason);

    const notifyTarget = booking.user_id === req.user.id
      ? (await getCaregiverProfileById(booking.provider_id))?.user_id
      : booking.user_id;

    if (notifyTarget) {
      try {
        await notifyUser({
          userId: notifyTarget,
          title: 'Booking Cancelled',
          body: `Booking ${booking.booking_number} was cancelled.`,
          type: 'BOOKING_CANCELLED',
          bookingId: booking.id,
          referenceId: booking.id,
          referenceType: 'booking',
          extraData: { screen: 'inbox' }
        });
      } catch (e) {
        console.error('Cancel notify failed:', e.message);
      }
    }

    res.success(updated, 'Booking cancelled successfully');
  } catch (error) {
    console.error('Cancel booking error:', error);
    res.serverError('Failed to cancel booking');
  }
};

exports.startBooking = async (req, res) => {
  try {
    const booking = await findById(req.params.id);
    if (!booking) return res.notFound('Booking not found');

    if (!(await isAssignedCaregiver(booking, req.user.id))) {
      return res.forbidden('Access denied — this booking is not assigned to you');
    }

    if (booking.status !== 'PAYMENT_PAID') {
      return res.error('Service can only be started after the user has paid');
    }

    const oldStatus = booking.status;
    await startService(booking.id);
    await addStatusHistory(
      booking.id,
      oldStatus,
      'SERVICE_IN_PROGRESS',
      req.user.id,
      'Caregiver started service'
    );

    try {
      await notifyUser({
        userId: booking.user_id,
        title: 'Service Started',
        body: `Caregiver started booking ${booking.booking_number}.`,
        type: 'SERVICE_STARTED',
        bookingId: booking.id,
        referenceId: booking.id,
        referenceType: 'booking',
        extraData: {
          booking_number: booking.booking_number,
          status: 'SERVICE_IN_PROGRESS',
          action: 'OPEN_BOOKING',
          screen: 'booking_details'
        }
      });
    } catch (notifyErr) {
      console.error('Notify user on start failed:', notifyErr.message);
    }

    const payload = await withJourney(await findById(booking.id), req.user.id);
    res.success(payload, 'Service started');
  } catch (error) {
    console.error('Start booking error:', error);
    res.serverError('Failed to start service');
  }
};

exports.completeBooking = async (req, res) => {
  try {
    const booking = await findById(req.params.id);
    if (!booking) return res.notFound('Booking not found');

    if (!(await isAssignedCaregiver(booking, req.user.id))) {
      return res.forbidden('Access denied — this booking is not assigned to you');
    }

    if (booking.status !== 'SERVICE_IN_PROGRESS') {
      return res.error('Service can only be completed after it has started');
    }

    const oldStatus = booking.status;
    await complete(booking.id);
    const settled = await settleEarning(booking.id);
    await addStatusHistory(
      booking.id,
      oldStatus,
      'SERVICE_COMPLETED',
      req.user.id,
      'Caregiver ended service'
    );

    if (booking.provider_type === 'CAREGIVER' && booking.provider_id) {
      try {
        await incrementCompletedBookings(booking.provider_id);
      } catch (countErr) {
        console.error('Increment completed bookings failed:', countErr.message);
      }
    }

    const caregiverEarning = await getCaregiverEarningForBooking(booking.id);

    try {
      await notifyUser({
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
          show_review: 'true'
        }
      });
    } catch (notifyErr) {
      console.error('Notify user on complete failed:', notifyErr.message);
    }

    const caregiver = await getCaregiverProfileById(booking.provider_id);
    if (caregiver?.user_id) {
      try {
        const amountText = caregiverEarning != null ? ` BDT ${caregiverEarning}` : '';
        await notifyUser({
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
        });
      } catch (notifyErr) {
        console.error('Notify caregiver on settle failed:', notifyErr.message);
      }
    }

    const payload = await withJourney(await findById(booking.id), req.user.id);
    res.success(
      {
        ...payload,
        earning_settled: !!settled?.earning_settled_at,
        caregiver_earning: caregiverEarning
      },
      'Service completed'
    );
  } catch (error) {
    console.error('Complete booking error:', error);
    res.serverError('Failed to complete service');
  }
};

exports.submitReview = async (req, res) => {
  try {
    const rating = Number(req.body.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.error('rating must be an integer from 1 to 5');
    }

    const booking = await findById(req.params.id);
    if (!booking) return res.notFound('Booking not found');

    if (booking.user_id !== req.user.id) {
      return res.forbidden('Only the booking user can submit a review');
    }

    if (booking.status !== 'SERVICE_COMPLETED') {
      return res.error('Review is allowed only after the caregiver ends the service');
    }

    if (booking.provider_type !== 'CAREGIVER' || !booking.provider_id) {
      return res.error('This booking has no caregiver to review');
    }

    const existing = await Review.findByBookingId(booking.id);
    if (existing) {
      return res.error('You have already submitted a review for this booking');
    }

    let review;
    try {
      review = await Review.createReview({
        booking_id: booking.id,
        user_id: req.user.id,
        caregiver_profile_id: booking.provider_id,
        rating
      });
    } catch (createErr) {
      if (createErr.code === '23505') {
        return res.error('You have already submitted a review for this booking');
      }
      throw createErr;
    }

    const stats = await Review.averageRatingForCaregiver(booking.provider_id);
    await updateRating(booking.provider_id, stats.avg_rating);

    const caregiver = await getCaregiverProfileById(booking.provider_id);
    if (caregiver?.user_id) {
      try {
        const stars = '★'.repeat(rating) + '☆'.repeat(5 - rating);
        await notifyUser({
          userId: caregiver.user_id,
          title: 'New rating received',
          body: `You received ${rating} star${rating === 1 ? '' : 's'} for booking ${booking.booking_number}. ${stars}`,
          type: 'REVIEW_RECEIVED',
          bookingId: booking.id,
          referenceId: booking.id,
          referenceType: 'booking',
          extraData: {
            booking_number: booking.booking_number,
            rating: String(rating),
            status: 'SERVICE_COMPLETED',
            action: 'OPEN_BOOKING',
            screen: 'booking_details'
          }
        });
      } catch (notifyErr) {
        console.error('Notify caregiver on review failed:', notifyErr.message);
      }
    }

    const payload = await withJourney(await findById(booking.id), req.user.id);
    res.created(
      {
        ...payload,
        caregiver_rating: stats.avg_rating,
        review_count: stats.total
      },
      'Review submitted'
    );
  } catch (error) {
    console.error('Submit review error:', error);
    res.serverError('Failed to submit review');
  }
};
