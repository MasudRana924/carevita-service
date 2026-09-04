const pool = require('../config/database');
const { findAll: findAllBookings, getActiveBookings, getTodayBookings } = require('../models/Booking');
const { searchCaregivers } = require('../models/CaregiverProfile');
const { searchNurses } = require('../models/NurseProfile');
const { updateVerificationStatus: updateCaregiverVerification } = require('../models/CaregiverProfile');
const { updateVerificationStatus: updateNurseVerification } = require('../models/NurseProfile');
const { getDocumentsByProvider, updateVerificationStatus: updateDocVerification } = require('../models/ProviderDocument');
const { findAll: findAllPayments } = require('../models/Payment');
const { createNotification } = require('../models/Notification');

exports.getDashboardStats = async (req, res) => {
  try {
    const usersResult = await pool.query('SELECT COUNT(*) as count FROM users');
    const bookingsResult = await pool.query('SELECT COUNT(*) as count FROM bookings');
    const paymentsResult = await pool.query('SELECT COUNT(*) as count FROM payments WHERE status = $1', ['COMPLETED']);
    const revenueResult = await pool.query('SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = $1', ['COMPLETED']);
    const caregiversResult = await pool.query('SELECT COUNT(*) as count FROM caregiver_profiles');
    const nursesResult = await pool.query('SELECT COUNT(*) as count FROM nurse_profiles');
    const pendingVerificationsResult = await pool.query(`
      SELECT COUNT(*) as count FROM provider_documents 
      WHERE verification_status = 'PENDING'
    `);

    const activeBookings = await getActiveBookings();
    const todayBookings = await getTodayBookings();

    res.success({
      totalUsers: parseInt(usersResult.rows[0].count),
      totalBookings: parseInt(bookingsResult.rows[0].count),
      activeBookings: activeBookings.length,
      todayBookings: todayBookings.length,
      totalPayments: parseInt(paymentsResult.rows[0].count),
      totalRevenue: parseFloat(revenueResult.rows[0].total),
      totalCaregivers: parseInt(caregiversResult.rows[0].count),
      totalNurses: parseInt(nursesResult.rows[0].count),
      pendingVerifications: parseInt(pendingVerificationsResult.rows[0].count)
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.serverError('Failed to fetch dashboard stats');
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const { role, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = 'SELECT id, name, email, phone, role, is_verified, status, created_at FROM users WHERE 1=1';
    const values = [];
    let paramCount = 0;

    if (role) {
      paramCount++;
      query += ` AND role = $${paramCount}`;
      values.push(role);
    }

    query += ' ORDER BY created_at DESC LIMIT $' + (paramCount + 1) + ' OFFSET $' + (paramCount + 2);
    values.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, values);

    res.success(result.rows, null, {
      page: parseInt(page),
      limit: parseInt(limit),
      total: result.rows.length
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.serverError('Failed to fetch users');
  }
};

exports.updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const query = 'UPDATE users SET status = $1 WHERE id = $2 RETURNING *';
    const result = await pool.query(query, [status, id]);

    if (result.rows.length === 0) {
      return res.notFound('User not found');
    }

    await createNotification({
      user_id: id,
      title: 'Account Status Updated',
      message: `Your account status has been updated to ${status}.`,
      type: 'ACCOUNT',
      reference_id: id,
      reference_type: 'user'
    });

    res.success(result.rows[0], 'User status updated successfully');
  } catch (error) {
    console.error('Update user status error:', error);
    res.serverError('Failed to update user status');
  }
};

exports.getAllBookings = async (req, res) => {
  try {
    const { status, provider_type, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const bookings = await findAllBookings({
      status,
      provider_type,
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
    res.serverError('Failed to fetch bookings');
  }
};

exports.getAllProviders = async (req, res) => {
  try {
    const { provider_type, verification_status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let providers = [];
    if (provider_type === 'CAREGIVER' || !provider_type) {
      providers = await searchCaregivers({
        verification_status,
        page: parseInt(page),
        limit: parseInt(limit)
      });
    } else if (provider_type === 'NURSE') {
      providers = await searchNurses({
        verification_status,
        page: parseInt(page),
        limit: parseInt(limit)
      });
    }

    res.success(providers, null, {
      page: parseInt(page),
      limit: parseInt(limit),
      total: providers.length
    });
  } catch (error) {
    console.error('Get providers error:', error);
    res.serverError('Failed to fetch providers');
  }
};

exports.verifyProvider = async (req, res) => {
  try {
    const { id } = req.params;
    const { provider_type, verification_status, note } = req.body;

    if (provider_type === 'CAREGIVER') {
      await updateCaregiverVerification(id, verification_status, note);
    } else if (provider_type === 'NURSE') {
      await updateNurseVerification(id, verification_status, note);
    }

    await createNotification({
      user_id: id,
      title: 'Verification Status Updated',
      message: `Your provider verification status has been updated to ${verification_status}.`,
      type: 'VERIFICATION',
      reference_id: id,
      reference_type: 'provider'
    });

    res.success(null, 'Provider verification updated successfully');
  } catch (error) {
    console.error('Verify provider error:', error);
    res.serverError('Failed to verify provider');
  }
};

exports.getPendingDocuments = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const query = `
      SELECT pd.*, u.name as provider_name, u.email as provider_email
      FROM provider_documents pd
      JOIN users u ON pd.provider_id = u.id
      WHERE pd.verification_status = 'PENDING'
      ORDER BY pd.submitted_at DESC
      LIMIT $1 OFFSET $2
    `;
    const result = await pool.query(query, [parseInt(limit), parseInt(offset)]);

    res.success(result.rows, null, {
      page: parseInt(page),
      limit: parseInt(limit),
      total: result.rows.length
    });
  } catch (error) {
    console.error('Get pending documents error:', error);
    res.serverError('Failed to fetch pending documents');
  }
};

exports.verifyDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { verification_status, note } = req.body;

    const document = await updateDocVerification(id, verification_status, note);

    await createNotification({
      user_id: document.provider_id,
      title: 'Document Verification Updated',
      message: `Your document verification status has been updated to ${verification_status}.`,
      type: 'VERIFICATION',
      reference_id: id,
      reference_type: 'document'
    });

    res.success(document, 'Document verification updated successfully');
  } catch (error) {
    console.error('Verify document error:', error);
    res.serverError('Failed to verify document');
  }
};

exports.getAllPayments = async (req, res) => {
  try {
    const { status, payment_method, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const payments = await findAllPayments({
      status,
      payment_method,
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
    res.serverError('Failed to fetch payments');
  }
};

exports.getAllHospitals = async (req, res) => {
  try {
    const { district, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM hospitals WHERE is_active = true';
    const values = [];
    let paramCount = 0;

    if (district) {
      paramCount++;
      query += ` AND district = $${paramCount}`;
      values.push(district);
    }

    query += ' ORDER BY name LIMIT $' + (paramCount + 1) + ' OFFSET $' + (paramCount + 2);
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

exports.updateHospitalStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    const query = 'UPDATE hospitals SET is_active = $1 WHERE id = $2 RETURNING *';
    const result = await pool.query(query, [is_active, id]);

    if (result.rows.length === 0) {
      return res.notFound('Hospital not found');
    }

    res.success(result.rows[0], 'Hospital status updated successfully');
  } catch (error) {
    console.error('Update hospital status error:', error);
    res.serverError('Failed to update hospital status');
  }
};

exports.getRevenueStats = async (req, res) => {
  try {
    const { date_from, date_to } = req.query;

    let query = `
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as transactions,
        COALESCE(SUM(amount), 0) as revenue
      FROM payments
      WHERE status = 'COMPLETED'
    `;
    const values = [];
    let paramCount = 0;

    if (date_from) {
      paramCount++;
      query += ` AND created_at >= $${paramCount}`;
      values.push(date_from);
    }

    if (date_to) {
      paramCount++;
      query += ` AND created_at <= $${paramCount}`;
      values.push(date_to);
    }

    query += ' GROUP BY DATE(created_at) ORDER BY date DESC';

    const result = await pool.query(query, values);

    res.success(result.rows);
  } catch (error) {
    console.error('Get revenue stats error:', error);
    res.serverError('Failed to fetch revenue stats');
  }
};
