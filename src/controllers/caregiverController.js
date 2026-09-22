const {
  createCaregiverProfile,
  getCaregiverProfileByUserId,
  getCaregiverProfileById,
  updateCaregiverProfile,
  searchCaregivers
} = require('../models/CaregiverProfile');
const { updateUser } = require('../models/User');
const { findByProviderId: findBookingsByProviderId } = require('../models/Booking');
const Wallet = require('../models/Wallet');
const Review = require('../models/Review');
const { journeyFlags, presentBooking } = require('../services/bookingJourney');
const { parsePagination } = require('../utils/pagination');
const { syncProfileFromUser } = require('../services/ekycService');

const presentOrUndefined = (value) => {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'string' && value.trim() === '') return undefined;
  return value;
};

/** Parse multipart/JSON service_areas into a TEXT[]-safe JS array. */
const parseServiceAreas = (value) => {
  if (value == null || value === '') return undefined;
  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim()).filter(Boolean);
  }
  const raw = String(value).trim();
  if (!raw) return undefined;
  if (raw.startsWith('[')) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((v) => String(v).trim()).filter(Boolean);
      }
    } catch {
      // fall through to comma / single value
    }
  }
  return raw.split(',').map((v) => v.trim()).filter(Boolean);
};

const parseBoolean = (value) => {
  if (value == null || value === '') return undefined;
  if (typeof value === 'boolean') return value;
  const s = String(value).trim().toLowerCase();
  if (['true', '1', 'yes'].includes(s)) return true;
  if (['false', '0', 'no'].includes(s)) return false;
  return undefined;
};

exports.createProfile = async (req, res) => {
  try {
    const {
      bio, experience_years, service_areas, hourly_rate, education,
      blood_group, date_of_birth, gender, district, thana,
      provider_type, credential_number, credential_type, specialization
    } = req.body;

    if (!district || !thana) {
      return res.error('District and thana are required');
    }

    const existingProfile = await getCaregiverProfileByUserId(req.user.id);
    if (existingProfile) {
      return res.conflict('Profile already exists');
    }

    const profilePhoto = req.file ? req.file.path : null;
    const type = String(provider_type || 'CAREGIVER').toUpperCase() === 'NURSE' ? 'NURSE' : 'CAREGIVER';
    if (type === 'NURSE' && !credential_number) {
      return res.error('credential_number is required for NURSE profiles');
    }

    const profile = await createCaregiverProfile({
      user_id: req.user.id,
      bio,
      experience_years: experience_years != null && experience_years !== '' ? Number(experience_years) : undefined,
      service_areas: parseServiceAreas(service_areas),
      hourly_rate: hourly_rate != null && hourly_rate !== '' ? Number(hourly_rate) : undefined,
      education,
      blood_group,
      date_of_birth,
      profile_photo: profilePhoto,
      gender,
      district: String(district).trim(),
      thana: String(thana).trim(),
      provider_type: type,
      credential_number,
      credential_type,
      specialization
    });

    const synced = await syncProfileFromUser(req.user.id);

    res.created(synced || profile, 'Caregiver profile created successfully');
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
      name, bio, experience_years, service_areas, hourly_rate, is_available,
      education, blood_group, date_of_birth, gender, district, thana
    } = req.body;

    const profile = await getCaregiverProfileByUserId(req.user.id);
    if (!profile) return res.notFound('Profile not found');

    // name lives on users table (same as /user/profile) — not caregiver_profiles
    if (presentOrUndefined(name) !== undefined) {
      await updateUser(req.user.id, { name: String(name).trim() });
    }

    const profilePhoto = req.file ? req.file.path : undefined;
    const districtValue = presentOrUndefined(district);
    const thanaValue = presentOrUndefined(thana);

    const updatedProfile = await updateCaregiverProfile(profile.id, {
      bio: presentOrUndefined(bio),
      experience_years: experience_years != null && experience_years !== '' ? Number(experience_years) : undefined,
      service_areas: parseServiceAreas(service_areas),
      hourly_rate: hourly_rate != null && hourly_rate !== '' ? Number(hourly_rate) : undefined,
      is_available: parseBoolean(is_available),
      education: presentOrUndefined(education),
      blood_group: presentOrUndefined(blood_group),
      date_of_birth: presentOrUndefined(date_of_birth),
      profile_photo: profilePhoto,
      gender: presentOrUndefined(gender),
      district: districtValue !== undefined ? String(districtValue).trim() : undefined,
      thana: thanaValue !== undefined ? String(thanaValue).trim() : undefined
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
      district, thana
    } = req.query;
    const { page, limit } = parsePagination(req.query);
    const { items, total } = await searchCaregivers({
      service_area,
      name,
      gender,
      verification_status,
      min_rating,
      district,
      thana,
      page,
      limit
    });

    return res.paginated(items, { page, limit, total }, 'Caregivers fetched successfully');
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
    const data = bookings.map((booking) => ({
      ...presentBooking(booking, { asProvider: true }),
      ...journeyFlags(booking, {
        userId: req.user.id,
        asProvider: true,
        review: null
      })
    }));
    res.success(data);
  } catch (error) {
    console.error('Get caregiver bookings error:', error);
    res.serverError('Failed to get caregiver bookings');
  }
};

exports.getMyWallet = async (req, res) => {
  try {
    const wallet = await Wallet.getOrCreateWallet(null, {
      userId: req.user.id,
      ownerType: 'CAREGIVER'
    });
    const transactions = await Wallet.listTransactions(wallet.id, {
      limit: parseInt(req.query.limit || 20, 10),
      offset: parseInt(req.query.offset || 0, 10)
    });
    res.success({
      balance: Number(wallet.balance),
      currency: wallet.currency || 'BDT',
      owner_type: wallet.owner_type,
      transactions
    });
  } catch (error) {
    console.error('Get caregiver wallet error:', error);
    res.serverError('Failed to fetch wallet');
  }
};

exports.getMyReviews = async (req, res) => {
  try {
    const profile = await getCaregiverProfileByUserId(req.user.id);
    if (!profile) return res.notFound('Caregiver profile not found');

    const { page, limit, offset } = parsePagination(req.query);
    const reviews = await Review.listByCaregiverProfileId(profile.id, { limit, offset });
    const stats = await Review.averageRatingForCaregiver(profile.id);

    return res.success(
      {
        rating: stats.avg_rating,
        total: stats.total,
        reviews
      },
      'Reviews fetched successfully',
      { page, limit, total: stats.total }
    );
  } catch (error) {
    console.error('Get caregiver reviews error:', error);
    res.serverError('Failed to fetch reviews');
  }
};
