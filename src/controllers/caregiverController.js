const { createCaregiverProfile, getCaregiverProfileByUserId, updateCaregiverProfile, updateVerificationStatus, searchCaregivers, updateRating } = require('../models/CaregiverProfile');
const { createProviderDocument, getDocumentsByProvider, updateVerificationStatus: updateDocVerification } = require('../models/ProviderDocument');
const { createAvailabilitySlot, getAvailabilityByProvider, deleteSlotsByProvider } = require('../models/AvailabilitySlot');
const { findByProviderId: findBookingsByProviderId } = require('../models/Booking');
const { findByProviderId: findReviewsByProviderId, getProviderAverageRating } = require('../models/Review');

exports.createProfile = async (req, res) => {
  try {
    const { bio, experience_years, service_areas, hourly_rate, education, blood_group, date_of_birth } = req.body;
    
    const existingProfile = await getCaregiverProfileByUserId(req.user.id);
    if (existingProfile) {
      return res.error('Profile already exists', [], 409);
    }

    const profile = await createCaregiverProfile({
      user_id: req.user.id,
      bio,
      experience_years,
      service_areas,
      hourly_rate,
      education,
      blood_group,
      date_of_birth
    });

    res.created(profile, 'Caregiver profile created successfully');
  } catch (error) {
    console.error('Create caregiver profile error:', error);
    res.serverError('Failed to create caregiver profile');
  }
};

exports.getMyProfile = async (req, res) => {
  try {
    const profile = await getCaregiverProfileByUserId(req.user.id);
    
    if (!profile) {
      return res.notFound('Profile not found');
    }

    res.success(profile);
  } catch (error) {
    console.error('Get caregiver profile error:', error);
    res.serverError('Failed to get caregiver profile');
  }
};

exports.updateMyProfile = async (req, res) => {
  try {
    const { bio, experience_years, service_areas, hourly_rate, is_available, education, blood_group, date_of_birth } = req.body;
    
    const profile = await getCaregiverProfileByUserId(req.user.id);
    if (!profile) {
      return res.notFound('Profile not found');
    }

    const updatedProfile = await updateCaregiverProfile(profile.id, {
      bio,
      experience_years,
      service_areas,
      hourly_rate,
      is_available,
      education,
      blood_group,
      date_of_birth
    });

    res.success(updatedProfile, 'Profile updated successfully');
  } catch (error) {
    console.error('Update caregiver profile error:', error);
    res.serverError('Failed to update caregiver profile');
  }
};

exports.submitDocument = async (req, res) => {
  try {
    const { document_type } = req.body;
    
    if (!req.file) {
      return res.error('No file uploaded');
    }

    const documentUrl = req.file.path;
    
    const document = await createProviderDocument({
      provider_id: req.user.id,
      provider_type: 'CAREGIVER',
      document_type,
      document_url
    });

    res.created(document, 'Document submitted successfully');
  } catch (error) {
    console.error('Submit document error:', error);
    res.serverError('Failed to submit document');
  }
};

exports.getMyAvailability = async (req, res) => {
  try {
    const { date_from, date_to } = req.query;
    
    const slots = await getAvailabilityByProvider(req.user.id, 'CAREGIVER', {
      date_from,
      date_to
    });

    res.success(slots);
  } catch (error) {
    console.error('Get availability error:', error);
    res.serverError('Failed to get availability');
  }
};

exports.setMyAvailability = async (req, res) => {
  try {
    const { is_available, slots } = req.body;
    
    await deleteSlotsByProvider(req.user.id, 'CAREGIVER');
    
    if (slots && slots.length > 0) {
      for (const slot of slots) {
        await createAvailabilitySlot({
          provider_id: req.user.id,
          provider_type: 'CAREGIVER',
          date: slot.date,
          start_time: slot.startTime,
          end_time: slot.endTime,
          is_available
        });
      }
    }

    res.success(null, 'Availability updated successfully');
  } catch (error) {
    console.error('Set availability error:', error);
    res.serverError('Failed to set availability');
  }
};

exports.searchCaregivers = async (req, res) => {
  try {
    const { service_area, verification_status, min_rating, page = 1, limit = 20 } = req.query;
    
    const caregivers = await searchCaregivers({
      service_area,
      verification_status,
      min_rating,
      page: parseInt(page),
      limit: parseInt(limit)
    });

    res.success(caregivers, null, {
      page: parseInt(page),
      limit: parseInt(limit),
      total: caregivers.length
    });
  } catch (error) {
    console.error('Search caregivers error:', error);
    res.serverError('Failed to search caregivers');
  }
};

exports.viewCaregiverProfile = async (req, res) => {
  try {
    const { id } = req.params;
    
    const profile = await getCaregiverProfileByUserId(id);
    
    if (!profile) {
      return res.notFound('Caregiver profile not found');
    }

    res.success(profile);
  } catch (error) {
    console.error('View caregiver profile error:', error);
    res.serverError('Failed to view caregiver profile');
  }
};

exports.getMyBookings = async (req, res) => {
  try {
    const { status } = req.query;
    
    const bookings = await findBookingsByProviderId(req.user.id, 'CAREGIVER', { status });

    res.success(bookings);
  } catch (error) {
    console.error('Get caregiver bookings error:', error);
    res.serverError('Failed to get caregiver bookings');
  }
};

exports.getMyEarnings = async (req, res) => {
  try {
    const bookings = await findBookingsByProviderId(req.user.id, 'CAREGIVER', {
      status: 'SERVICE_COMPLETED'
    });

    const totalEarnings = bookings.reduce((sum, booking) => sum + (booking.provider_amount || 0), 0);

    res.success({
      total_earnings: totalEarnings,
      completed_bookings: bookings.length,
      bookings
    });
  } catch (error) {
    console.error('Get earnings error:', error);
    res.serverError('Failed to get earnings');
  }
};

exports.getMyReviews = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    
    const reviews = await findReviewsByProviderId(req.user.id, 'CAREGIVER', {
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });

    const avgRating = await getProviderAverageRating(req.user.id, 'CAREGIVER');

    res.success({
      reviews,
      average_rating: avgRating
    }, null, {
      page: parseInt(page),
      limit: parseInt(limit),
      total: reviews.length
    });
  } catch (error) {
    console.error('Get reviews error:', error);
    res.serverError('Failed to get reviews');
  }
};
