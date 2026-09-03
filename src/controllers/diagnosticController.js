const {
  searchDiagnosticTests,
  findAllDiagnosticTests,
  findDiagnosticTestById
} = require('../models/Diagnostic');
const {
  findAllDiagnosticCenters
} = require('../models/Diagnostic');
const {
  createDiagnosticBooking,
  findDiagnosticBookingsByUserId,
  findDiagnosticBookingById,
  updateDiagnosticBookingStatus
} = require('../models/Diagnostic');
const { findFamilyMemberByUserIdAndId } = require('../models/FamilyMember');

exports.searchDiagnosticTests = async (req, res) => {
  try {
    const { query, category, limit } = req.query;

    let tests;
    if (query) {
      tests = await searchDiagnosticTests(query, {
        is_active: true,
        category,
        limit: limit || 20
      });
    } else {
      tests = await findAllDiagnosticTests({
        is_active: true,
        category,
        limit: limit || 20
      });
    }

    res.status(200).json({
      success: true,
      tests
    });
  } catch (error) {
    console.error('Search tests error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search tests'
    });
  }
};

exports.getDiagnosticCenters = async (req, res) => {
  try {
    const { city, district, limit } = req.query;

    const centers = await findAllDiagnosticCenters({
      is_active: true,
      is_verified: true,
      city,
      district,
      limit: limit || 20
    });

    res.status(200).json({
      success: true,
      centers
    });
  } catch (error) {
    console.error('Get centers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch centers'
    });
  }
};

exports.createDiagnosticBooking = async (req, res) => {
  try {
    const {
      family_member_id, diagnostic_center_id, test_id,
      scheduled_date, is_home_collection, collection_address,
      collection_lat, collection_long, payment_method
    } = req.body;

    if (!test_id || !scheduled_date) {
      return res.status(400).json({
        success: false,
        message: 'Test ID and scheduled date are required'
      });
    }

    const test = await findDiagnosticTestById(test_id);
    if (!test) {
      return res.status(404).json({
        success: false,
        message: 'Test not found'
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

    const booking = await createDiagnosticBooking({
      user_id: req.user.id,
      family_member_id,
      diagnostic_center_id,
      test_id,
      scheduled_date,
      is_home_collection: is_home_collection || false,
      collection_address,
      collection_lat,
      collection_long,
      total_amount: test.price,
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

exports.getDiagnosticBookings = async (req, res) => {
  try {
    const { status, limit } = req.query;

    const bookings = await findDiagnosticBookingsByUserId(req.user.id, {
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

exports.getDiagnosticBooking = async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await findDiagnosticBookingById(id);

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

exports.cancelDiagnosticBooking = async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await findDiagnosticBookingById(id);

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

    await updateDiagnosticBookingStatus(id, 'cancelled');

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
