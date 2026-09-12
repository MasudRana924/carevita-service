const {
  createCaregiverProfile,
  getCaregiverProfileByUserId,
  getCaregiverProfileById,
  updateCaregiverProfile,
  searchCaregivers
} = require('../models/CaregiverProfile');
const { findByProviderId: findBookingsByProviderId } = require('../models/Booking');

exports.createProfile = async (req, res) => {
  try {
    const {
      bio, experience_years, service_areas, hourly_rate, education,
      blood_group, date_of_birth, gender, district, thana
    } = req.body;

    if (!district || !thana) {
      return res.error('District and thana are required');
    }

    const existingProfile = await getCaregiverProfileByUserId(req.user.id);
    if (existingProfile) {
      return res.error('Profile already exists', [], 409);
    }

    const profilePhoto = req.file ? req.file.path : null;

    const profile = await createCaregiverProfile({
      user_id: req.user.id,
      bio,
      experience_years,
      service_areas,
      hourly_rate,
      education,
      blood_group,
      date_of_birth,
      profile_photo: profilePhoto,
      gender,
      district: String(district).trim(),
      thana: String(thana).trim()
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
    if (!profile) return res.notFound('Profile not found');
    res.success(profile);
  } catch (error) {
    console.error('Get caregiver profile error:', error);
    res.serverError('Failed to get caregiver profile');
  }
};

exports.updateMyProfile = async (req, res) => {
  try {
    const {
      bio, experience_years, service_areas, hourly_rate, is_available,
      education, blood_group, date_of_birth, gender, district, thana
    } = req.body;

    const profile = await getCaregiverProfileByUserId(req.user.id);
    if (!profile) return res.notFound('Profile not found');

    const profilePhoto = req.file ? req.file.path : profile.profile_photo;

    const updatedProfile = await updateCaregiverProfile(profile.id, {
      bio,
      experience_years,
      service_areas,
      hourly_rate,
      is_available,
      education,
      blood_group,
      date_of_birth,
      profile_photo: profilePhoto,
      gender,
      district: district !== undefined ? String(district).trim() : undefined,
      thana: thana !== undefined ? String(thana).trim() : undefined
    });

    res.success(updatedProfile, 'Profile updated successfully');
  } catch (error) {
    console.error('Update caregiver profile error:', error);
    res.serverError('Failed to update caregiver profile');
  }
};

exports.searchCaregivers = async (req, res) => {
  try {
    const {
      service_area, name, gender, verification_status, min_rating,
      district, thana, page = 1, limit = 20
    } = req.query;

    const caregivers = await searchCaregivers({
      service_area,
      name,
      gender,
      verification_status,
      min_rating,
      district,
      thana,
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
    let profile = await getCaregiverProfileById(id);
    if (!profile) profile = await getCaregiverProfileByUserId(id);
    if (!profile) return res.notFound('Caregiver profile not found');
    res.success(profile);
  } catch (error) {
    console.error('View caregiver profile error:', error);
    res.serverError('Failed to view caregiver profile');
  }
};

exports.getMyBookings = async (req, res) => {
  try {
    const { status } = req.query;
    const profile = await getCaregiverProfileByUserId(req.user.id);
    if (!profile) return res.notFound('Caregiver profile not found');

    const bookings = await findBookingsByProviderId(profile.id, 'CAREGIVER', { status });
    res.success(bookings);
  } catch (error) {
    console.error('Get caregiver bookings error:', error);
    res.serverError('Failed to get caregiver bookings');
  }
};
