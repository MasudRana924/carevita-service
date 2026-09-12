const {
  createBooking,
  findById,
  findByUserId,
  updateStatus,
  clearProvider,
  cancel,
  addStatusHistory,
  getStatusHistory
} = require('../models/Booking');
const { findByUserIdAndId } = require('../models/FamilyMember');
const {
  getCaregiverProfileByUserId,
  getCaregiverProfileById
} = require('../models/CaregiverProfile');
const { notifyUser } = require('../services/pushNotificationService');
const {
  canUserPayBooking,
  payableAmount
} = require('../services/paymentEligibility');
const { bkashConfig } = require('../services/bkashService');

const resolveCaregiverProfileId = async (userId) => {
  const profile = await getCaregiverProfileByUserId(userId);
  return profile ? profile.id : null;
};

const isAssignedCaregiver = async (booking, userId) => {
  if (booking.provider_type !== 'CAREGIVER') return false;
  const providerProfileId = await resolveCaregiverProfileId(userId);
  return !!providerProfileId && booking.provider_id === providerProfileId;
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
    const platform_fee = 100;
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

    res.success(bookings, null, {
      page: parseInt(page),
      limit: parseInt(limit),
      total: bookings.length
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
    const can_pay = canUserPayBooking(booking, req.user.id);
    res.success({
      ...booking,
      history,
      can_pay,
      pay_amount: can_pay ? payableAmount(booking) : 0,
      bkash_script: bkashConfig.script
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
