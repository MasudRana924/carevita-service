const { createNurse, findByUserId, findById, updateNurse, findAvailable, incrementCompletedServices } = require('../models/Nurse');
const { findById: findBookingById, findByProviderId, updateStatus, addStatusTimeline, complete } = require('../models/Booking');
const Review = require('../models/Review');

exports.createNurseProfile = async (req, res) => {
  try {
    const {
      name, photo, nid_number, credentials, experience,
      specializations, languages, skills, location_lat, location_long, service_areas
    } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Name is required'
      });
    }

    const existingProfile = await findByUserId(req.user.id);
    if (existingProfile) {
      return res.status(409).json({
        success: false,
        message: 'Profile already exists'
      });
    }

    const nurse = await createNurse({
      user_id: req.user.id,
      name,
      photo,
      nid_number,
      credentials,
      experience,
      specializations,
      languages,
      skills,
      location_lat,
      location_long,
      service_areas
    });

    res.status(201).json({
      success: true,
      message: 'Nurse profile created successfully',
      nurse
    });
  } catch (error) {
    console.error('Create nurse error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create profile'
    });
  }
};

exports.getNurseProfile = async (req, res) => {
  try {
    const nurse = await findByUserId(req.user.id);

    if (!nurse) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }

    res.status(200).json({
      success: true,
      nurse
    });
  } catch (error) {
    console.error('Get nurse error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile'
    });
  }
};

exports.updateNurseProfile = async (req, res) => {
  try {
    const {
      name, photo, nid_number, credentials, experience,
      specializations, languages, skills, location_lat, location_long, service_areas, is_available
    } = req.body;

    const nurse = await findByUserId(req.user.id);
    if (!nurse) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }

    const updated = await updateNurse(nurse.id, {
      name,
      photo,
      nid_number,
      credentials,
      experience,
      specializations,
      languages,
      skills,
      location_lat,
      location_long,
      service_areas,
      is_available
    });

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      nurse: updated
    });
  } catch (error) {
    console.error('Update nurse error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
};

exports.updateAvailability = async (req, res) => {
  try {
    const { is_available } = req.body;

    const nurse = await findByUserId(req.user.id);
    if (!nurse) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }

    const updated = await updateNurse(nurse.id, { is_available });

    res.status(200).json({
      success: true,
      message: 'Availability updated successfully',
      is_available: updated.is_available
    });
  } catch (error) {
    console.error('Update availability error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update availability'
    });
  }
};

exports.searchNurses = async (req, res) => {
  try {
    const {
      location_lat, location_long, radius, specialization,
      min_rating, min_experience, limit
    } = req.query;

    const filters = {
      location_lat,
      location_long,
      radius,
      specialization,
      min_rating,
      min_experience,
      limit: limit || 20
    };

    const nurses = await findAvailable(filters);

    res.status(200).json({
      success: true,
      nurses
    });
  } catch (error) {
    console.error('Search nurses error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search nurses'
    });
  }
};

exports.getNurseById = async (req, res) => {
  try {
    const { id } = req.params;

    const nurse = await findById(id);

    if (!nurse) {
      return res.status(404).json({
        success: false,
        message: 'Nurse not found'
      });
    }

    const reviews = await Review.findByProviderId(id, 'nurse', { limit: 10 });

    res.status(200).json({
      success: true,
      nurse,
      reviews
    });
  } catch (error) {
    console.error('Get nurse error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch nurse'
    });
  }
};

exports.getProviderBookings = async (req, res) => {
  try {
    const { status, limit } = req.query;

    const nurse = await findByUserId(req.user.id);
    if (!nurse) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }

    const bookings = await findByProviderId(
      nurse.id,
      'nurse',
      { status, limit: limit || 20 }
    );

    res.status(200).json({
      success: true,
      bookings
    });
  } catch (error) {
    console.error('Get provider bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bookings'
    });
  }
};

exports.acceptBooking = async (req, res) => {
  try {
    const { id } = req.params;

    const nurse = await findByUserId(req.user.id);
    if (!nurse) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }

    const booking = await findBookingById(id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    if (booking.provider_id) {
      return res.status(400).json({
        success: false,
        message: 'Booking already assigned'
      });
    }

    const updated = await Booking.update(id, { provider_id: nurse.id });
    await Booking.updateStatus(id, 'confirmed');
    await Booking.addStatusTimeline(id, 'confirmed', 'Provider accepted the booking');

    res.status(200).json({
      success: true,
      message: 'Booking accepted successfully',
      booking: updated
    });
  } catch (error) {
    console.error('Accept booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to accept booking'
    });
  }
};

exports.updateBookingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes, location_lat, location_long } = req.body;

    const nurse = await findByUserId(req.user.id);
    if (!nurse) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }

    const booking = await findBookingById(id);
    if (!booking || booking.provider_id !== nurse.id) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found or not assigned to you'
      });
    }

    const updated = await updateStatus(id, status);
    await addStatusTimeline(id, status, notes, location_lat, location_long);

    if (status === 'completed') {
      await complete(id);
      await incrementCompletedServices(nurse.id);
    }

    res.status(200).json({
      success: true,
      message: 'Booking status updated successfully',
      booking: updated
    });
  } catch (error) {
    console.error('Update booking status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update booking status'
    });
  }
};
