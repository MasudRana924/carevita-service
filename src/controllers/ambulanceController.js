const {
  createAmbulanceBooking,
  findAmbulanceBookingsByUserId,
  findAmbulanceBookingById,
  cancelAmbulanceBooking
} = require('../models/Ambulance');
const { findFamilyMemberByUserIdAndId } = require('../models/FamilyMember');

exports.createAmbulanceBooking = async (req, res) => {
  try {
    const {
      family_member_id, ambulance_type, pickup_location,
      pickup_lat, pickup_long, destination_location, destination_lat,
      destination_long, patient_condition, emergency_contact,
      scheduled_date, payment_method
    } = req.body;

    if (!ambulance_type || !pickup_location || !scheduled_date) {
      return res.status(400).json({
        success: false,
        message: 'Ambulance type, pickup location, and scheduled date are required'
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

    const prices = {
      general: 500,
      ac: 800,
      icu: 1500,
      emergency: 1000
    };

    const total_amount = prices[ambulance_type] || 500;

    const booking = await createAmbulanceBooking({
      user_id: req.user.id,
      family_member_id,
      ambulance_type,
      pickup_location,
      pickup_lat,
      pickup_long,
      destination_location,
      destination_lat,
      destination_long,
      patient_condition,
      emergency_contact,
      scheduled_date,
      total_amount,
      payment_method
    });

    res.status(201).json({
      success: true,
      message: 'Ambulance booking created successfully',
      booking
    });
  } catch (error) {
    console.error('Create ambulance booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create booking'
    });
  }
};

exports.getAmbulanceBookings = async (req, res) => {
  try {
    const { status, limit } = req.query;

    const bookings = await findAmbulanceBookingsByUserId(req.user.id, {
      status,
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

exports.getAmbulanceBooking = async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await findAmbulanceBookingById(id);

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

    res.status(200).json({
      success: true,
      booking
    });
  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch booking'
    });
  }
};

exports.cancelAmbulanceBooking = async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await findAmbulanceBookingById(id);

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

    await cancelAmbulanceBooking(id);

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
