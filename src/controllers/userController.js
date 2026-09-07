const { findById: findUserById, updateUser } = require('../models/User');
const { findByUserId: findBookingsByUserId } = require('../models/Booking');
const { findByUserId: findPaymentsByUserId } = require('../models/Payment');
const { findNotificationsByUserId, markAllNotificationsAsRead } = require('../models/Notification');

exports.getMyProfile = async (req, res) => {
  try {
    const user = await findUserById(req.user.id);
    
    if (!user) {
      return res.notFound('User not found');
    }

    res.success({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      profile_photo: user.profile_photo,
      role: user.role,
      is_verified: user.is_verified,
      ekyc_status: user.ekyc_status,
      language_preference: user.language_preference,
      emergency_contact: user.emergency_contact,
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
    if (req.file) {
      profilePhoto = req.file.path;
    }
    
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

    res.success({
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      phone: updatedUser.phone,
      profile_photo: updatedUser.profile_photo,
      role: updatedUser.role,
      language_preference: updatedUser.language_preference,
      emergency_contact: updatedUser.emergency_contact,
      address: updatedUser.address,
      date_of_birth: updatedUser.date_of_birth
    }, 'Profile updated successfully');
  } catch (error) {
    console.error('Update profile error:', error);
    res.serverError('Failed to update profile');
  }
};

exports.uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.error('No file uploaded');
    }

    const avatarUrl = req.file.path;
    
    await updateUser(req.user.id, { profile_photo: avatarUrl });

    res.success({ profile_photo: avatarUrl }, 'Avatar uploaded successfully');
  } catch (error) {
    console.error('Upload avatar error:', error);
    res.serverError('Failed to upload avatar');
  }
};

exports.getMyBookings = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const offset = (page - 1) * limit;

    const bookings = await findBookingsByUserId(req.user.id, {
      status,
      limit: parseInt(limit),
      offset: parseInt(offset)
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

exports.getMyPayments = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const offset = (page - 1) * limit;

    const payments = await findPaymentsByUserId(req.user.id, {
      status,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.success(payments, null, {
      page: parseInt(page),
      limit: parseInt(limit),
      total: payments.length
    });
  } catch (error) {
    console.error('Get payments error:', error);
    res.serverError('Failed to get payments');
  }
};

exports.getMyNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20, is_read } = req.query;
    const offset = (page - 1) * limit;

    const notifications = await findNotificationsByUserId(req.user.id, {
      is_read: is_read === 'true' ? true : is_read === 'false' ? false : undefined,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.success(notifications, null, {
      page: parseInt(page),
      limit: parseInt(limit),
      total: notifications.length
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.serverError('Failed to get notifications');
  }
};

exports.markNotificationsReadAll = async (req, res) => {
  try {
    await markAllNotificationsAsRead(req.user.id);

    res.success(null, 'All notifications marked as read');
  } catch (error) {
    console.error('Mark notifications read error:', error);
    res.serverError('Failed to mark notifications as read');
  }
};
