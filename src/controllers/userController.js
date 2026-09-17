const { findById: findUserById, updateUser } = require('../models/User');
const { findByUserId: findBookingsByUserId, countByUserId: countBookingsByUserId } = require('../models/Booking');
const { publicUser } = require('../utils/serializers');
const { parsePagination } = require('../utils/pagination');

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
