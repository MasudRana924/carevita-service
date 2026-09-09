const {
  createBooking,
  findById,
  findByUserId,
  updateBooking,
  updateStatus,
  clearProvider,
  cancel,
  complete,
  addStatusHistory,
  getStatusHistory
} = require('../models/Booking');
const { findById: findFamilyMemberById, findByUserIdAndId } = require('../models/FamilyMember');
const { createAddress } = require('../models/Address');
const { createReview, findByBookingId, getProviderAverageRating } = require('../models/Review');
const { createNotification } = require('../models/Notification');
const { getCaregiverProfileByUserId, updateRating: updateCaregiverRating } = require('../models/CaregiverProfile');
const { getNurseProfileByUserId, updateRating: updateNurseRating } = require('../models/NurseProfile');
const PricingService = require('../services/pricingService');

const resolveProviderProfileId = async (userId, providerType) => {
  if (providerType === 'CAREGIVER') {
    const profile = await getCaregiverProfileByUserId(userId);
    return profile ? profile.id : null;
  }
  if (providerType === 'NURSE') {
    const profile = await getNurseProfileByUserId(userId);
    return profile ? profile.id : null;
  }
  return null;
};

const isAssignedProvider = async (booking, userId) => {
  const providerProfileId = await resolveProviderProfileId(userId, booking.provider_type);
  return !!providerProfileId && booking.provider_id === providerProfileId;
};

exports.createBooking = async (req, res) => {
  try {
    const {
      service_type, family_member_id, provider_type, provider_id,
      hospital_id, booking_date, start_time, duration_hours,
      pickup_location, destination_location, patient_requirements, notes
    } = req.body;

    if (!service_type || !family_member_id || !booking_date || !start_time || !duration_hours) {
      return res.error('Service type, family member, booking date, start time, and duration are required');
    }

    const familyMember = await findByUserIdAndId(req.user.id, family_member_id);
    if (!familyMember) {
      return res.notFound('Family member not found');
    }

    let pickup_address_id = null;
    if (pickup_location) {
      const pickupAddress = await createAddress({
        address_line: pickup_location.address,
        city: pickup_location.city,
        district: pickup_location.district,
        division: pickup_location.division,
        latitude: pickup_location.latitude,
        longitude: pickup_location.longitude
      });
      pickup_address_id = pickupAddress.id;
    }

    let destination_address_id = null;
    if (destination_location) {
      const destinationAddress = await createAddress({
        address_line: destination_location.address,
        city: destination_location.city,
        district: destination_location.district,
        division: destination_location.division,
        latitude: destination_location.latitude,
        longitude: destination_location.longitude
      });
      destination_address_id = destinationAddress.id;
    }

    const end_time = new Date(`${booking_date}T${start_time}`);
    end_time.setHours(end_time.getHours() + parseInt(duration_hours));

    // Calculate price using PricingService
    const providerRate = service_type === 'HOSPITAL_ASSISTANCE' ? 250 : 500;
    const pricing = PricingService.calculateBookingPrice({
      providerRate,
      durationHours: parseInt(duration_hours),
      discount: 0
    });

    const booking = await createBooking({
      user_id: req.user.id,
      family_member_id,
      service_type,
      provider_type,
      provider_id,
      hospital_id,
      booking_date,
      start_time,
      end_time: end_time.toTimeString().slice(0, 5),
      duration_hours,
      pickup_address_id,
      destination_address_id,
      patient_requirements,
      notes,
      service_charge: pricing.subtotal,
      platform_fee: pricing.platformFee,
      discount: pricing.discount,
      total_amount: pricing.totalAmount,
      advance_percentage: 50,
      advance_amount: pricing.advanceAmount,
      remaining_amount: pricing.remainingAmount
    });

    await createNotification({
      user_id: req.user.id,
      title: 'Booking Created',
      message: `Your booking ${booking.booking_number} has been created. Please complete payment.`,
      type: 'BOOKING',
      reference_id: booking.id,
      reference_type: 'booking'
    });

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
    const { id } = req.params;

    const booking = await findById(id);

    if (!booking) {
      return res.notFound('Booking not found');
    }

    if (booking.user_id !== req.user.id && !(await isAssignedProvider(booking, req.user.id))) {
      return res.forbidden('Access denied');
    }

    const history = await getStatusHistory(id);

    // Structure the response with nested objects
    const structuredBooking = {
      id: booking.id,
      booking_number: booking.booking_number,
      user_id: booking.user_id,
      service_type: booking.service_type,
      provider_type: booking.provider_type,
      provider_id: booking.provider_id,
      booking_date: booking.booking_date,
      start_time: booking.start_time,
      end_time: booking.end_time,
      duration_hours: booking.duration_hours,
      pickup_address_id: booking.pickup_address_id,
      destination_address_id: booking.destination_address_id,
      notes: booking.notes,
      service_charge: booking.service_charge,
      platform_fee: booking.platform_fee,
      discount: booking.discount,
      total_amount: booking.total_amount,
      advance_percentage: booking.advance_percentage,
      advance_amount: booking.advance_amount,
      remaining_amount: booking.remaining_amount,
      status: booking.status,
      payment_status: booking.payment_status,
      payment_method: booking.payment_method,
      cancellation_reason: booking.cancellation_reason,
      cancelled_by: booking.cancelled_by,
      cancelled_at: booking.cancelled_at,
      completed_at: booking.completed_at,
      created_at: booking.created_at,
      updated_at: booking.updated_at,
      patient_requirements: booking.patient_requirements,
      customer: {
        name: booking.customer_name,
        phone: booking.customer_phone
      },
      family_member: {
        id: booking.family_member_id,
        name: booking.family_member_name,
        photo: booking.family_member_photo,
        relationship: booking.family_member_relationship,
        blood_group: booking.family_member_blood_group,
        date_of_birth: booking.family_member_dob
      },
      hospital: booking.hospital_id ? {
        id: booking.hospital_id,
        name: booking.hospital_name,
        address: booking.hospital_address,
        phone: booking.hospital_phone,
        photo: booking.hospital_photo
      } : null,
      caregiver: booking.provider_type === 'CAREGIVER' && booking.provider_id ? {
        id: booking.provider_id,
        name: booking.caregiver_name,
        phone: booking.caregiver_phone,
        email: booking.caregiver_email,
        bio: booking.caregiver_bio,
        education: booking.caregiver_education,
        experience_years: booking.caregiver_experience,
        rating: booking.caregiver_rating,
        profile_photo: booking.caregiver_photo,
        gender: booking.caregiver_gender
      } : null,
      history
    };

    res.success(structuredBooking);
  } catch (error) {
    console.error('Get booking error:', error);
    res.serverError('Failed to fetch booking');
  }
};

exports.updateBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const booking = await findById(id);

    if (!booking) {
      return res.notFound('Booking not found');
    }

    if (booking.user_id !== req.user.id) {
      return res.forbidden('Access denied');
    }

    if (booking.status !== 'PENDING_PAYMENT') {
      return res.error('Cannot update confirmed or in-progress bookings');
    }

    const updated = await updateBooking(id, { notes });

    res.success(updated, 'Booking updated successfully');
  } catch (error) {
    console.error('Update booking error:', error);
    res.serverError('Failed to update booking');
  }
};

exports.acceptBooking = async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await findById(id);

    if (!booking) {
      return res.notFound('Booking not found');
    }

    const providerProfileId = await resolveProviderProfileId(req.user.id, booking.provider_type);
    if (!providerProfileId || booking.provider_id !== providerProfileId) {
      return res.forbidden('Access denied — this booking is not assigned to you');
    }

    if (!['SEARCHING_PROVIDER', 'PROVIDER_ASSIGNED'].includes(booking.status)) {
      return res.error('Booking cannot be accepted in current status');
    }

    const oldStatus = booking.status;
    const updated = await updateStatus(id, 'PROVIDER_ACCEPTED');
    await addStatusHistory(id, oldStatus, 'PROVIDER_ACCEPTED', req.user.id, 'Provider accepted booking');

    await createNotification({
      user_id: booking.user_id,
      title: 'Booking Accepted',
      message: `Your booking ${booking.booking_number} has been accepted by the provider.`,
      type: 'BOOKING',
      reference_id: booking.id,
      reference_type: 'booking'
    });

    res.success(updated, 'Booking accepted successfully');
  } catch (error) {
    console.error('Accept booking error:', error);
    res.serverError('Failed to accept booking');
  }
};

exports.rejectBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const booking = await findById(id);

    if (!booking) {
      return res.notFound('Booking not found');
    }

    const providerProfileId = await resolveProviderProfileId(req.user.id, booking.provider_type);
    if (!providerProfileId || booking.provider_id !== providerProfileId) {
      return res.forbidden('Access denied — this booking is not assigned to you');
    }

    if (!['SEARCHING_PROVIDER', 'PROVIDER_ASSIGNED', 'PROVIDER_ACCEPTED'].includes(booking.status)) {
      return res.error('Booking cannot be rejected in current status');
    }

    const oldStatus = booking.status;
    const rejectReason = reason || 'No reason provided';
    const updated = await clearProvider(id, 'CANCELLED_BY_PROVIDER');
    await addStatusHistory(id, oldStatus, 'CANCELLED_BY_PROVIDER', req.user.id, `Provider rejected: ${rejectReason}`);

    await createNotification({
      user_id: booking.user_id,
      title: 'Booking Rejected',
      message: `Provider rejected your booking ${booking.booking_number}. Reason: ${rejectReason}`,
      type: 'BOOKING',
      reference_id: booking.id,
      reference_type: 'booking'
    });

    res.success(updated, 'Booking rejected successfully');
  } catch (error) {
    console.error('Reject booking error:', error);
    res.serverError('Failed to reject booking');
  }
};

exports.startService = async (req, res) => {
  try {
    const { id } = req.params;
    const { latitude, longitude } = req.body;

    const booking = await findById(id);

    if (!booking) {
      return res.notFound('Booking not found');
    }

    if (!(await isAssignedProvider(booking, req.user.id))) {
      return res.forbidden('Access denied');
    }

    if (booking.status !== 'PROVIDER_ACCEPTED' && booking.status !== 'PROVIDER_ON_THE_WAY') {
      return res.error('Service cannot be started in current status');
    }

    const oldStatus = booking.status;
    const updated = await updateStatus(id, 'SERVICE_STARTED');
    await addStatusHistory(id, oldStatus, 'SERVICE_STARTED', req.user.id, 'Service started', latitude, longitude);

    await createNotification({
      user_id: booking.user_id,
      title: 'Service Started',
      message: `Service for booking ${booking.booking_number} has started.`,
      type: 'BOOKING',
      reference_id: booking.id,
      reference_type: 'booking'
    });

    res.success(updated, 'Service started successfully');
  } catch (error) {
    console.error('Start service error:', error);
    res.serverError('Failed to start service');
  }
};

exports.pickupPatient = async (req, res) => {
  try {
    const { id } = req.params;
    const { latitude, longitude, note } = req.body;

    const booking = await findById(id);

    if (!booking) {
      return res.notFound('Booking not found');
    }

    if (!(await isAssignedProvider(booking, req.user.id))) {
      return res.forbidden('Access denied');
    }

    if (booking.service_type !== 'HOSPITAL_ASSISTANCE') {
      return res.error('Pickup is only available for hospital assistance');
    }

    if (booking.status !== 'SERVICE_STARTED') {
      return res.error('Patient cannot be picked up in current status');
    }

    const oldStatus = booking.status;
    const updated = await updateStatus(id, 'PATIENT_PICKED_UP');
    await addStatusHistory(id, oldStatus, 'PATIENT_PICKED_UP', req.user.id, note, latitude, longitude);

    await createNotification({
      user_id: booking.user_id,
      title: 'Patient Picked Up',
      message: `Patient has been picked up for booking ${booking.booking_number}.`,
      type: 'BOOKING',
      reference_id: booking.id,
      reference_type: 'booking'
    });

    res.success(updated, 'Patient picked up successfully');
  } catch (error) {
    console.error('Pickup patient error:', error);
    res.serverError('Failed to pick up patient');
  }
};

exports.completeService = async (req, res) => {
  try {
    const { id } = req.params;
    const { completion_note } = req.body;

    const booking = await findById(id);

    if (!booking) {
      return res.notFound('Booking not found');
    }

    if (!(await isAssignedProvider(booking, req.user.id))) {
      return res.forbidden('Access denied');
    }

    if (booking.status !== 'SERVICE_STARTED' && booking.status !== 'PATIENT_PICKED_UP' && booking.status !== 'SERVICE_IN_PROGRESS') {
      return res.error('Service cannot be completed in current status');
    }

    const oldStatus = booking.status;
    const updated = await complete(id);
    await addStatusHistory(id, oldStatus, 'SERVICE_COMPLETED', req.user.id, completion_note);

    await createNotification({
      user_id: booking.user_id,
      title: 'Service Completed',
      message: `Service for booking ${booking.booking_number} has been completed. Please rate your experience.`,
      type: 'BOOKING',
      reference_id: booking.id,
      reference_type: 'booking'
    });

    res.success(updated, 'Service completed successfully');
  } catch (error) {
    console.error('Complete service error:', error);
    res.serverError('Failed to complete service');
  }
};

exports.cancelBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const booking = await findById(id);

    if (!booking) {
      return res.notFound('Booking not found');
    }

    const asProvider = await isAssignedProvider(booking, req.user.id);
    if (booking.user_id !== req.user.id && !asProvider) {
      return res.forbidden('Access denied');
    }

    if (booking.status === 'SERVICE_COMPLETED' || booking.status === 'CANCELLED_BY_USER' || booking.status === 'CANCELLED_BY_PROVIDER') {
      return res.error('Cannot cancel this booking');
    }

    const cancelStatus = booking.user_id === req.user.id ? 'CANCELLED_BY_USER' : 'CANCELLED_BY_PROVIDER';
    const oldStatus = booking.status;
    const updated = await cancel(id, reason, cancelStatus);
    await addStatusHistory(id, oldStatus, cancelStatus, req.user.id, reason);

    await createNotification({
      user_id: booking.user_id,
      title: 'Booking Cancelled',
      message: `Booking ${booking.booking_number} has been cancelled. Reason: ${reason}`,
      type: 'BOOKING',
      reference_id: booking.id,
      reference_type: 'booking'
    });

    res.success(updated, 'Booking cancelled successfully');
  } catch (error) {
    console.error('Cancel booking error:', error);
    res.serverError('Failed to cancel booking');
  }
};

exports.submitReview = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      rating, comment, feedback,
      overall_rating, punctuality_rating, politeness_rating,
      professionalism_rating, helpfulness_rating, trustworthiness_rating, review
    } = req.body;

    const booking = await findById(id);

    if (!booking) {
      return res.notFound('Booking not found');
    }

    if (booking.user_id !== req.user.id) {
      return res.forbidden('Access denied');
    }

    if (booking.status !== 'SERVICE_COMPLETED') {
      return res.error('Can only review completed bookings');
    }

    if (!booking.provider_id) {
      return res.error('No provider assigned to this booking');
    }

    const existing = await findByBookingId(booking.id);
    if (existing) {
      return res.error('You have already reviewed this booking', [], 409);
    }

    const overall = overall_rating || rating;
    if (!overall || overall < 1 || overall > 5) {
      return res.error('Rating is required (1-5)');
    }

    const reviewText = review || feedback || comment || null;

    const created = await createReview({
      booking_id: booking.id,
      user_id: req.user.id,
      provider_id: booking.provider_id,
      provider_type: booking.provider_type,
      overall_rating: overall,
      punctuality_rating: punctuality_rating || overall,
      politeness_rating: politeness_rating || overall,
      professionalism_rating: professionalism_rating || overall,
      helpfulness_rating: helpfulness_rating || overall,
      trustworthiness_rating: trustworthiness_rating || overall,
      review: reviewText
    });

    const avgRating = await getProviderAverageRating(booking.provider_id, booking.provider_type);
    const avg = parseFloat(avgRating.avg_overall) || overall;

    if (booking.provider_type === 'CAREGIVER') {
      await updateCaregiverRating(booking.provider_id, avg);
    } else if (booking.provider_type === 'NURSE') {
      await updateNurseRating(booking.provider_id, avg);
    }

    try {
      if (booking.provider_type === 'CAREGIVER') {
        const { getCaregiverProfileById } = require('../models/CaregiverProfile');
        const profile = await getCaregiverProfileById(booking.provider_id);
        if (profile) {
          await createNotification({
            user_id: profile.user_id,
            title: 'New Review Received',
            message: `You received a ${overall}/5 review on booking ${booking.booking_number}.`,
            type: 'REVIEW',
            reference_id: created.id,
            reference_type: 'review'
          });
        }
      } else if (booking.provider_type === 'NURSE') {
        const { getNurseProfileById } = require('../models/NurseProfile');
        const profile = await getNurseProfileById(booking.provider_id);
        if (profile) {
          await createNotification({
            user_id: profile.user_id,
            title: 'New Review Received',
            message: `You received a ${overall}/5 review on booking ${booking.booking_number}.`,
            type: 'REVIEW',
            reference_id: created.id,
            reference_type: 'review'
          });
        }
      }
    } catch (notifyErr) {
      console.error('Review notify provider error:', notifyErr.message);
    }

    res.created(created, 'Review submitted successfully');
  } catch (error) {
    console.error('Submit review error:', error);
    res.serverError('Failed to submit review');
  }
};
