const pool = require('../config/database');
const { findAll: findAllBookings, getActiveBookings, getTodayBookings } = require('../models/Booking');
const { searchCaregivers } = require('../models/CaregiverProfile');
const { createNotification } = require('../models/Notification');
const {
  findAll: findAllUsers,
  findById: findUserById,
  adminUpdateUser
} = require('../models/User');
const {
  createHospital,
  findById: findHospitalById,
  updateHospital
} = require('../models/Hospital');

exports.getAdminProfile = async (req, res) => {
  try {
    const user = await findUserById(req.user.id);
    if (!user) return res.notFound('Admin not found');
    const { password, ...safe } = user;
    res.success(safe);
  } catch (error) {
    console.error('Get admin profile error:', error);
    res.serverError('Failed to fetch admin profile');
  }
};

exports.getDashboardStats = async (req, res) => {
  try {
    const usersResult = await pool.query("SELECT COUNT(*) as count FROM users WHERE role != 'ADMIN'");
    const bookingsResult = await pool.query('SELECT COUNT(*) as count FROM bookings');
    const caregiversResult = await pool.query('SELECT COUNT(*) as count FROM caregiver_profiles');
    const hospitalsResult = await pool.query('SELECT COUNT(*) as count FROM hospitals');
    const activeBookings = await getActiveBookings();
    const todayBookings = await getTodayBookings();

    res.success({
      totalUsers: parseInt(usersResult.rows[0].count),
      totalBookings: parseInt(bookingsResult.rows[0].count),
      activeBookings: activeBookings.length,
      todayBookings: todayBookings.length,
      totalCaregivers: parseInt(caregiversResult.rows[0].count),
      totalHospitals: parseInt(hospitalsResult.rows[0].count)
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.serverError('Failed to fetch dashboard stats');
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const { role, status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const users = await findAllUsers({
      role: role || undefined,
      status,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.success(users.filter((u) => u.role !== 'ADMIN' || role === 'ADMIN'), null, {
      page: parseInt(page),
      limit: parseInt(limit),
      total: users.length
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.serverError('Failed to fetch users');
  }
};

exports.blockUser = async (req, res) => {
  try {
    const updated = await adminUpdateUser(req.params.id, { status: 'blocked' });
    if (!updated) return res.notFound('User not found');
    await createNotification({
      user_id: req.params.id,
      title: 'Account Blocked',
      message: 'Your account has been blocked by admin.',
      type: 'ACCOUNT',
      reference_id: req.params.id,
      reference_type: 'user'
    });
    res.success(updated, 'User blocked');
  } catch (error) {
    console.error('Block user error:', error);
    res.serverError('Failed to block user');
  }
};

exports.unblockUser = async (req, res) => {
  try {
    const updated = await adminUpdateUser(req.params.id, { status: 'active' });
    if (!updated) return res.notFound('User not found');
    res.success(updated, 'User unblocked');
  } catch (error) {
    console.error('Unblock user error:', error);
    res.serverError('Failed to unblock user');
  }
};

exports.updateUserStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.error('status is required');
    const updated = await adminUpdateUser(req.params.id, { status });
    if (!updated) return res.notFound('User not found');
    res.success(updated, 'User status updated');
  } catch (error) {
    console.error('Update user status error:', error);
    res.serverError('Failed to update user status');
  }
};

exports.getAllCaregivers = async (req, res) => {
  try {
    const { verification_status, page = 1, limit = 20 } = req.query;
    const caregivers = await searchCaregivers({
      verification_status,
      page: parseInt(page),
      limit: parseInt(limit)
    });
    res.success(caregivers, null, {
      page: parseInt(page),
      limit: parseInt(limit),
      total: caregivers.length
    });
  } catch (error) {
    console.error('Get caregivers error:', error);
    res.serverError('Failed to fetch caregivers');
  }
};

exports.blockCaregiver = async (req, res) => {
  try {
    const { id } = req.params;
    // id can be caregiver profile id or user id — try profile first
    let profile = await pool.query('SELECT * FROM caregiver_profiles WHERE id = $1', [id]);
    if (!profile.rows.length) {
      profile = await pool.query('SELECT * FROM caregiver_profiles WHERE user_id = $1', [id]);
    }
    if (!profile.rows.length) return res.notFound('Caregiver not found');

    const row = profile.rows[0];
    await pool.query(
      `UPDATE caregiver_profiles SET verification_status = 'SUSPENDED', is_available = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [row.id]
    );
    await adminUpdateUser(row.user_id, { status: 'blocked' });

    res.success({ caregiver_id: row.id, user_id: row.user_id }, 'Caregiver blocked');
  } catch (error) {
    console.error('Block caregiver error:', error);
    res.serverError('Failed to block caregiver');
  }
};

exports.unblockCaregiver = async (req, res) => {
  try {
    const { id } = req.params;
    let profile = await pool.query('SELECT * FROM caregiver_profiles WHERE id = $1', [id]);
    if (!profile.rows.length) {
      profile = await pool.query('SELECT * FROM caregiver_profiles WHERE user_id = $1', [id]);
    }
    if (!profile.rows.length) return res.notFound('Caregiver not found');

    const row = profile.rows[0];
    await pool.query(
      `UPDATE caregiver_profiles SET verification_status = 'APPROVED', is_available = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [row.id]
    );
    await adminUpdateUser(row.user_id, { status: 'active' });

    res.success({ caregiver_id: row.id, user_id: row.user_id }, 'Caregiver unblocked');
  } catch (error) {
    console.error('Unblock caregiver error:', error);
    res.serverError('Failed to unblock caregiver');
  }
};

exports.createHospital = async (req, res) => {
  try {
    const { name, address, phone, email, location_lat, location_long, city, district, type, details } = req.body;
    if (!name) return res.error('Hospital name is required');

    let photoUrl = req.file ? req.file.path : null;
    const query = `
      INSERT INTO hospitals (name, address, phone, email, location_lat, location_long, city, district, type, photo, details)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;
    const result = await pool.query(query, [
      name, address, phone, email, location_lat, location_long, city, district, type, photoUrl, details
    ]);
    res.created(result.rows[0], 'Hospital created successfully');
  } catch (error) {
    console.error('Create hospital error:', error);
    res.serverError('Failed to create hospital');
  }
};

exports.getAllHospitals = async (req, res) => {
  try {
    const { district, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    let query = 'SELECT * FROM hospitals WHERE 1=1';
    const values = [];
    let paramCount = 0;

    if (district) {
      paramCount++;
      query += ` AND district = $${paramCount}`;
      values.push(district);
    }

    query += ` ORDER BY name LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    values.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, values);
    res.success(result.rows, null, {
      page: parseInt(page),
      limit: parseInt(limit),
      total: result.rows.length
    });
  } catch (error) {
    console.error('Get hospitals error:', error);
    res.serverError('Failed to fetch hospitals');
  }
};

exports.updateHospital = async (req, res) => {
  try {
    const existing = await findHospitalById(req.params.id);
    if (!existing) return res.notFound('Hospital not found');

    const photo = req.file ? req.file.path : existing.photo;
    const updated = await updateHospital(req.params.id, {
      name: req.body.name ?? existing.name,
      address: req.body.address ?? existing.address,
      phone: req.body.phone ?? existing.phone,
      email: req.body.email ?? existing.email,
      location_lat: req.body.location_lat ?? existing.location_lat,
      location_long: req.body.location_long ?? existing.location_long,
      city: req.body.city ?? existing.city,
      district: req.body.district ?? existing.district,
      type: req.body.type ?? existing.type,
      is_active: req.body.is_active !== undefined ? req.body.is_active : existing.is_active
    });

    if (photo && photo !== existing.photo) {
      await pool.query('UPDATE hospitals SET photo = $1 WHERE id = $2', [photo, req.params.id]);
      updated.photo = photo;
    }

    res.success(updated, 'Hospital updated successfully');
  } catch (error) {
    console.error('Update hospital error:', error);
    res.serverError('Failed to update hospital');
  }
};

exports.updateHospitalStatus = async (req, res) => {
  try {
    const { is_active } = req.body;
    const result = await pool.query(
      'UPDATE hospitals SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [is_active, req.params.id]
    );
    if (!result.rows.length) return res.notFound('Hospital not found');
    res.success(result.rows[0], 'Hospital status updated');
  } catch (error) {
    console.error('Update hospital status error:', error);
    res.serverError('Failed to update hospital status');
  }
};
