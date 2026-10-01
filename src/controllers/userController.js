const { findById: findUserById, updateUser } = require('../models/User');
const { findByUserId: findBookingsByUserId, countByUserId: countBookingsByUserId } = require('../models/Booking');
const { publicUser } = require('../utils/serializers');
const { parsePagination } = require('../utils/pagination');
const accountService = require('../services/accountService');

const mapServiceError = (res, error, fallback) => {
  if (error.statusCode) {
    return res.error(error.message, [], error.statusCode, error.code);
  }
  console.error(fallback, error);
  return res.serverError(fallback);
};

exports.getMe = async (req, res) => {
  try {
    const account = await accountService.getAccount(req.user.id);
    return res.success(account, 'Account fetched successfully');
  } catch (error) {
    return mapServiceError(res, error, 'Failed to fetch account');
  }
};

exports.updateMe = async (req, res) => {
  try {
    const account = await accountService.updateAccount(req.user.id, req.body || {});
    return res.success(account, 'Profile updated successfully');
  } catch (error) {
    return mapServiceError(res, error, 'Failed to update profile');
  }
};

exports.updateMyPhoto = async (req, res) => {
  try {
    const account = await accountService.updatePhoto(req.user.id, req.file);
    return res.success(account, 'Profile photo updated successfully');
  } catch (error) {
    return mapServiceError(res, error, 'Failed to update profile photo');
  }
};

exports.getMyProfile = async (req, res) => {
  try {
    const user = await findUserById(req.user.id);
    if (!user) return res.notFound('User not found');

    return res.success(publicUser(user), 'Profile fetched successfully');
  } catch (error) {
    console.error('Get profile error:', error);
    return res.serverError('Failed to get profile');
  }
};

exports.updateMyProfile = async (req, res) => {
  try {
    const { name, email, phone, language_preference, emergency_contact, address, date_of_birth } = req.body;

    let profilePhoto = req.body.profile_photo;
    if (req.file) profilePhoto = req.file.path;

    const updatedUser = await updateUser(req.user.id, {
      name,
      email,
      phone,
      profile_photo: profilePhoto,
      language_preference,
      emergency_contact,
      address,
      date_of_birth
    });

    return res.success(publicUser(updatedUser), 'Profile updated successfully');
  } catch (error) {
    console.error('Update profile error:', error);
    return res.serverError('Failed to update profile');
  }
};

exports.uploadAvatar = async (req, res) => {
  try {
    if (!req.file) return res.badRequest('No file uploaded');
    const updatedUser = await updateUser(req.user.id, { profile_photo: req.file.path });
    return res.success(publicUser(updatedUser), 'Avatar uploaded successfully');
  } catch (error) {
    console.error('Upload avatar error:', error);
    return res.serverError('Failed to upload avatar');
  }
};

exports.getMyBookings = async (req, res) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { status } = req.query;
    const [bookings, total] = await Promise.all([
      findBookingsByUserId(req.user.id, { status, limit, offset }),
      countBookingsByUserId(req.user.id, { status })
    ]);

    return res.paginated(bookings, { page, limit, total }, 'Bookings fetched successfully');
  } catch (error) {
    console.error('Get bookings error:', error);
    return res.serverError('Failed to get bookings');
  }
};
