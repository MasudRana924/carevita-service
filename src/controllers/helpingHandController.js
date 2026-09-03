const { createHelpingHand, findByUserId, findById, updateHelpingHand, findAvailable, findAll, incrementCompletedJobs } = require('../models/HelpingHand');
const { createBooking, findById: findBookingById, findByProviderId, updateStatus, addStatusTimeline, complete } = require('../models/Booking');
const { findById: findServiceById } = require('../models/Service');
const Review = require('../models/Review');

exports.createHelpingHandProfile = async (req, res) => {
  try {
    const {
      name, photo, nid_number, experience, languages,
      skills, location_lat, location_long, service_areas
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

    const helpingHand = await createHelpingHand({
      user_id: req.user.id,
      name,
      photo,
      nid_number,
      experience,
      languages,
      skills,
      location_lat,
      location_long,
      service_areas
    });

    res.status(201).json({
      success: true,
      message: 'Helping Hand profile created successfully',
      helpingHand
    });
  } catch (error) {
    console.error('Create helping hand error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create profile'
    });
  }
};

exports.getHelpingHandProfile = async (req, res) => {
  try {
    const helpingHand = await findByUserId(req.user.id);

    if (!helpingHand) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }

    res.status(200).json({
      success: true,
      helpingHand
    });
  } catch (error) {
    console.error('Get helping hand error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile'
    });
  }
};

exports.updateHelpingHandProfile = async (req, res) => {
  try {
    const {
      name, photo, nid_number, experience, languages,
      skills, location_lat, location_long, service_areas, is_available
    } = req.body;

    const helpingHand = await findByUserId(req.user.id);
    if (!helpingHand) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }

    const updated = await updateHelpingHand(helpingHand.id, {
      name,
      photo,
      nid_number,
      experience,
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
      helpingHand: updated
    });
  } catch (error) {
    console.error('Update helping hand error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
};

exports.updateAvailability = async (req, res) => {
  try {
    const { is_available } = req.body;

    const helpingHand = await findByUserId(req.user.id);
    if (!helpingHand) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }

    const updated = await updateHelpingHand(helpingHand.id, { is_available });

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

exports.searchHelpingHands = async (req, res) => {
  try {
    const {
      location_lat, location_long, radius, hospital_id,
      min_rating, min_experience, limit
    } = req.query;

    const filters = {
      location_lat,
      location_long,
      radius,
      hospital_id,
      min_rating,
      min_experience,
      limit: limit || 20
    };

    const helpingHands = await findAvailable(filters);

    res.status(200).json({
      success: true,
      helpingHands
    });
  } catch (error) {
    console.error('Search helping hands error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search helping hands'
    });
  }
};

exports.getHelpingHandById = async (req, res) => {
  try {
    const { id } = req.params;

    const helpingHand = await findById(id);

    if (!helpingHand) {
      return res.status(404).json({
        success: false,
        message: 'Helping Hand not found'
      });
    }

    const service = await findServiceById(helpingHand.service_id);
    const reviews = await Review.findByProviderId(id, 'helping_hand', { limit: 10 });

    res.status(200).json({
      success: true,
      helpingHand,
      reviews
    });
  } catch (error) {
    console.error('Get helping hand error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch helping hand'
    });
  }
};

exports.getProviderBookings = async (req, res) => {
  try {
    const { status, limit } = req.query;

    const helpingHand = await findByUserId(req.user.id);
    if (!helpingHand) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }

    const bookings = await findByProviderId(
      helpingHand.id,
      'helping_hand',
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

    const helpingHand = await findByUserId(req.user.id);
    if (!helpingHand) {
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

    const updated = await Booking.update(id, { provider_id: helpingHand.id });
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

    const helpingHand = await findByUserId(req.user.id);
    if (!helpingHand) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }

    const booking = await findBookingById(id);
    if (!booking || booking.provider_id !== helpingHand.id) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found or not assigned to you'
      });
    }

    const updated = await updateStatus(id, status);
    await addStatusTimeline(id, status, notes, location_lat, location_long);

    if (status === 'completed') {
      await complete(id);
      await incrementCompletedJobs(helpingHand.id);
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

exports.getBookingTimeline = async (req, res) => {
  try {
    const { id } = req.params;

    const timeline = await Booking.getStatusTimeline(id);

    res.status(200).json({
      success: true,
      timeline
    });
  } catch (error) {
    console.error('Get timeline error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch timeline'
    });
  }
};
