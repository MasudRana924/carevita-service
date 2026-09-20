const pool = require('../config/database');
const { searchCaregivers } = require('../models/CaregiverProfile');
const { adminUpdateUser } = require('../models/User');
const { parsePagination } = require('../utils/pagination');
const { writeAudit } = require('../utils/audit');
const {
  getAdminEkycDetails,
  adminReviewEkyc
} = require('../services/ekycService');
const diditService = require('../services/diditService');

exports.getAllCaregivers = async (req, res) => {
  try {
    const { verification_status, ekyc_session_status } = req.query;
    const { page, limit } = parsePagination(req.query);
    const { items, total } = await searchCaregivers({
      verification_status,
      ekyc_session_status,
      page,
      limit
    });
    return res.paginated(items, { page, limit, total }, 'Caregivers fetched successfully');
  } catch (error) {
    console.error('Get caregivers error:', error);
    res.serverError('Failed to fetch caregivers');
  }
};

exports.blockCaregiver = async (req, res) => {
  try {
    const { id } = req.params;
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

    await writeAudit({
      actorId: req.user.id,
      action: 'CAREGIVER_BLOCKED',
      entityType: 'caregiver',
      entityId: row.id,
      meta: { user_id: row.user_id }
    });
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

    await writeAudit({
      actorId: req.user.id,
      action: 'CAREGIVER_UNBLOCKED',
      entityType: 'caregiver',
      entityId: row.id,
      meta: { user_id: row.user_id }
    });
    res.success({ caregiver_id: row.id, user_id: row.user_id }, 'Caregiver unblocked');
  } catch (error) {
    console.error('Unblock caregiver error:', error);
    res.serverError('Failed to unblock caregiver');
  }
};

exports.getCaregiverEkyc = async (req, res) => {
  try {
    const data = await getAdminEkycDetails(req.params.id);
    return res.success(data, 'Caregiver eKYC details fetched');
  } catch (error) {
    console.error('Get caregiver eKYC error:', error);
    if (error.statusCode === 404) return res.notFound(error.message);
    if (error.statusCode && error.statusCode < 500) {
      return res.error(error.message, [], error.statusCode);
    }
    return res.serverError('Failed to fetch caregiver eKYC');
  }
};

exports.approveCaregiverEkyc = async (req, res) => {
  try {
    const comment = req.body?.comment || req.body?.note || null;
    const data = await adminReviewEkyc({
      id: req.params.id,
      newStatus: diditService.APPROVED_STATUS,
      comment,
      actorId: req.user.id
    });
    return res.success(data, 'Caregiver eKYC approved on Didit');
  } catch (error) {
    console.error('Approve caregiver eKYC error:', error);
    if (error.statusCode === 404) return res.notFound(error.message);
    if (error.statusCode === 503) {
      return res.error(error.message, [], 503, 'INTERNAL_ERROR');
    }
    if (error.statusCode && error.statusCode < 500) {
      return res.error(error.message, [], error.statusCode);
    }
    return res.serverError('Failed to approve caregiver eKYC');
  }
};

exports.declineCaregiverEkyc = async (req, res) => {
  try {
    const comment = req.body?.comment || req.body?.note || req.body?.reason || null;
    const data = await adminReviewEkyc({
      id: req.params.id,
      newStatus: 'Declined',
      comment,
      actorId: req.user.id
    });
    return res.success(data, 'Caregiver eKYC declined on Didit');
  } catch (error) {
    console.error('Decline caregiver eKYC error:', error);
    if (error.statusCode === 404) return res.notFound(error.message);
    if (error.statusCode === 503) {
      return res.error(error.message, [], 503, 'INTERNAL_ERROR');
    }
    if (error.statusCode && error.statusCode < 500) {
      return res.error(error.message, [], error.statusCode);
    }
    return res.serverError('Failed to decline caregiver eKYC');
  }
};
