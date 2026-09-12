const { findById: findUserById, updateUser } = require('../models/User');
const { findByUserId: findBookingsByUserId } = require('../models/Booking');

exports.getMyProfile = async (req, res) => {
  try {
    const user = await findUserById(req.user.id);
    if (!user) return res.notFound('User not found');

    res.success({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      profile_photo: user.profile_photo,
      role: user.role,
      status: user.status,
      is_verified: user.is_verified,
      language_preference: user.language_preference,
      emergency_contact: user.emergency_contact,
      address: user.address,
      date_of_birth: user.date_of_birth,
      created_at: user.created_at
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.serverError('Failed to get profile');
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

    res.success(updatedUser, 'Profile updated successfully');
  } catch (error) {
    console.error('Update profile error:', error);
    res.serverError('Failed to update profile');
  }
};

exports.uploadAvatar = async (req, res) => {
  try {
    if (!req.file) return res.error('No file uploaded');
    const updatedUser = await updateUser(req.user.id, { profile_photo: req.file.path });
    res.success(updatedUser, 'Avatar uploaded successfully');
  } catch (error) {
    console.error('Upload avatar error:', error);
    res.serverError('Failed to upload avatar');
  }
};

exports.getMyBookings = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const bookings = await findBookingsByUserId(req.user.id, {
      status,
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });
    res.success(bookings, null, {
      page: parseInt(page),
      limit: parseInt(limit),
      total: bookings.length
    });
  } catch (error) {
    console.error('Get bookings error:', error);
    res.serverError('Failed to get bookings');
  }
};
