const {
  createBooking,
  findBookingsByUserId,
  findBookingById,
  updateBooking,
  cancelBooking,
  getBookingStatusTimeline
} = require('../models/Booking');
const { findServiceById } = require('../models/Service');
const { findFamilyMemberByUserIdAndId } = require('../models/FamilyMember');
const { findHospitalById } = require('../models/Hospital');
const { findAvailableHelpingHands } = require('../models/HelpingHand');
const { findAvailableNurses } = require('../models/Nurse');

exports.createBooking = async (req, res) => {
  try {
    const {
      family_member_id, service_id, provider_type, provider_id,
      hospital_id, scheduled_date, scheduled_end_date, pickup_location,
      destination_location, patient_requirements, instructions, payment_method
    } = req.body;

    if (!service_id || !scheduled_date) {
      return res.status(400).json({
        success: false,
        message: 'Service ID and scheduled date are required'
      });
    }

    const service = await findServiceById(service_id);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    if (family_member_id) {
      const familyMember = await findFamilyMemberByUserIdAndId(req.user.id, family_member_id);
      if (!familyMember) {
        return res.status(404).json({
          success: false,
          message: 'Family member not found'
        });
      }
    }

    if (hospital_id) {
      const hospital = await findHospitalById(hospital_id);
      if (!hospital) {
        return res.status(404).json({
          success: false,
          message: 'Hospital not found'
        });
      }
    }

    const platform_fee = service.base_price * 0.15;
    const provider_amount = service.base_price - platform_fee;

    const booking = await createBooking({
      user_id: req.user.id,
      family_member_id,
      service_id,
      provider_type: provider_type || service.category,
      provider_id,
      hospital_id,
      scheduled_date,
      scheduled_end_date,
      pickup_location,
      destination_location,
      patient_requirements,
      instructions,
      total_amount: service.base_price,
      platform_fee,
      provider_amount,
      payment_method
    });

    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      booking
    });
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create booking'
    });
  }
};

exports.getBookings = async (req, res) => {
  try {
    const { status, provider_type, limit } = req.query;

    const bookings = await findBookingsByUserId(req.user.id, {
      status,
      provider_type,
      limit: limit || 20
    });

    res.status(200).json({
      success: true,
      bookings
    });
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bookings'
    });
  }
};

exports.getBooking = async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await findBookingById(id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    if (booking.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const timeline = await getBookingStatusTimeline(id);

    res.status(200).json({
      success: true,
      booking,
      timeline
    });
  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch booking'
    });
  }
};

exports.updateBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      scheduled_date, scheduled_end_date, pickup_location,
      destination_location, patient_requirements, instructions
    } = req.body;

    const booking = await findBookingById(id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    if (booking.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    if (booking.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update confirmed or in-progress bookings'
      });
    }

    const updated = await updateBooking(id, {
      scheduled_date,
      scheduled_end_date,
      pickup_location,
      destination_location,
      patient_requirements,
      instructions
    });

    res.status(200).json({
      success: true,
      message: 'Booking updated successfully',
      booking: updated
    });
  } catch (error) {
    console.error('Update booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update booking'
    });
  }
};

exports.cancelBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { cancellation_reason } = req.body;

    const booking = await findBookingById(id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    if (booking.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    if (booking.status === 'completed' || booking.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel this booking'
      });
    }

    await cancelBooking(id, cancellation_reason, req.user.id);

    res.status(200).json({
      success: true,
      message: 'Booking cancelled successfully'
    });
  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel booking'
    });
  }
};

exports.getAvailableProviders = async (req, res) => {
  try {
    const { service_id, hospital_id, location_lat, location_long, radius } = req.query;

    const service = await findServiceById(service_id);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    let providers = [];
    if (service.category === 'helping_hand') {
      providers = await findAvailableHelpingHands({
        location_lat,
        location_long,
        radius,
        hospital_id,
        limit: 10
      });
    } else if (service.category === 'nurse') {
      providers = await findAvailableNurses({
        location_lat,
        location_long,
        radius,
        limit: 10
      });
    }

    res.status(200).json({
      success: true,
      providers
    });
  } catch (error) {
    console.error('Get providers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch providers'
    });
  }
};
