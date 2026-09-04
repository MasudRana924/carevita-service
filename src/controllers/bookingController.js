const {
  createBooking,
  findById,
  findByUserId,
  updateBooking,
  updateStatus,
  cancel,
  complete,
  addStatusHistory,
  getStatusHistory
} = require('../models/Booking');
const { findById: findFamilyMemberById, findByUserIdAndId } = require('../models/FamilyMember');
const { createAddress } = require('../models/Address');
const { createReview } = require('../models/Review');
const { createNotification } = require('../models/Notification');

exports.createBooking = async (req, res) => {
  try {
    const {
      service_type, family_member_id, provider_type, provider_id,
      hospital_id, booking_date, start_time, duration_hours,
      pickup_location, destination, notes
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

    const end_time = new Date(`${booking_date}T${start_time}`);
    end_time.setHours(end_time.getHours() + parseInt(duration_hours));

    const basePrice = service_type === 'HOSPITAL_ASSISTANCE' ? 300 : 500;
    const hourlyRate = service_type === 'HOSPITAL_ASSISTANCE' ? 250 : 500;
    const service_charge = basePrice + (hourlyRate * duration_hours);
    const platform_fee = 100;
    const total_amount = service_charge + platform_fee;
    const advance_percentage = 50;
    const advance_amount = total_amount * (advance_percentage / 100);
    const remaining_amount = total_amount - advance_amount;

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
      destination_address_id: null,
      notes,
      service_charge,
      platform_fee,
      discount: 0,
      total_amount,
      advance_percentage,
      advance_amount,
      remaining_amount
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

    if (booking.user_id !== req.user.id && booking.provider_id !== req.user.id) {
      return res.forbidden('Access denied');
    }

    const history = await getStatusHistory(id);

    res.success({ ...booking, history });
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

    if (booking.provider_id !== req.user.id) {
      return res.forbidden('Access denied');
    }

    if (booking.status !== 'SEARCHING_PROVIDER') {
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

    if (booking.provider_id !== req.user.id) {
      return res.forbidden('Access denied');
    }

    if (booking.status !== 'SEARCHING_PROVIDER') {
      return res.error('Booking cannot be rejected in current status');
    }

    const oldStatus = booking.status;
    const updated = await updateStatus(id, 'SEARCHING_PROVIDER');
    await addStatusHistory(id, oldStatus, 'SEARCHING_PROVIDER', req.user.id, `Provider rejected: ${reason}`);

    await createNotification({
      user_id: booking.user_id,
      title: 'Booking Rejected',
      message: `Provider rejected your booking ${booking.booking_number}. Reason: ${reason}`,
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

    if (booking.provider_id !== req.user.id) {
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

    if (booking.provider_id !== req.user.id) {
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

    if (booking.provider_id !== req.user.id) {
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

    if (booking.user_id !== req.user.id && booking.provider_id !== req.user.id) {
      return res.forbidden('Access denied');
    }

    if (booking.status === 'SERVICE_COMPLETED' || booking.status === 'CANCELLED_BY_USER' || booking.status === 'CANCELLED_BY_PROVIDER') {
      return res.error('Cannot cancel this booking');
    }

    const cancelStatus = req.user.id === booking.user_id ? 'CANCELLED_BY_USER' : 'CANCELLED_BY_PROVIDER';
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
    const { rating, comment } = req.body;

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

    const review = await createReview({
      booking_id: booking.id,
      user_id: req.user.id,
      provider_id: booking.provider_id,
      provider_type: booking.provider_type,
      overall_rating: rating,
      punctuality_rating: rating,
      politeness_rating: rating,
      professionalism_rating: rating,
      helpfulness_rating: rating,
      trustworthiness_rating: rating,
      review: comment
    });

    res.created(review, 'Review submitted successfully');
  } catch (error) {
    console.error('Submit review error:', error);
    res.serverError('Failed to submit review');
  }
};
