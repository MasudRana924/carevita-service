const { createWithdrawal, getWithdrawals, getWithdrawalById, updateWithdrawalStatus, getAllWithdrawals } = require('../models/Withdrawal');
const { getCaregiverProfileByUserId: findCaregiverProfile } = require('../models/CaregiverProfile');
const { getNurseProfileByUserId: findNurseProfile } = require('../models/NurseProfile');
const { getProviderWallet } = require('../models/Wallet');

/**
 * Create withdrawal request
 */
exports.createWithdrawal = async (req, res) => {
  try {
    const { amount, payment_account_id } = req.body;
    const userId = req.user.id;
    const providerType = req.user.role === 'CAREGIVER' ? 'CAREGIVER' : 'NURSE';

    // Get provider profile
    let providerProfile;
    if (providerType === 'CAREGIVER') {
      providerProfile = await findCaregiverProfile(userId);
    } else {
      providerProfile = await findNurseProfile(userId);
    }

    if (!providerProfile) {
      return res.notFound('Provider profile not found');
    }

    // Check wallet balance
    const wallet = await getProviderWallet(providerProfile.id, providerType);
    if (!wallet || wallet.available_balance < amount) {
      return res.badRequest('Insufficient wallet balance');
    }

    const withdrawal = await createWithdrawal({
      provider_id: providerProfile.id,
      provider_type: providerType,
      amount,
      payment_account_id
    });

    res.success(withdrawal, 'Withdrawal request created successfully');
  } catch (error) {
    console.error('Create withdrawal error:', error);
    res.serverError('Failed to create withdrawal request');
  }
};

/**
 * Get provider's withdrawals
 */
exports.getWithdrawals = async (req, res) => {
  try {
    const userId = req.user.id;
    const providerType = req.user.role === 'CAREGIVER' ? 'CAREGIVER' : 'NURSE';
    const { status, page = 1, limit = 20 } = req.query;

    // Get provider profile
    let providerProfile;
    if (providerType === 'CAREGIVER') {
      providerProfile = await findCaregiverProfile(userId);
    } else {
      providerProfile = await findNurseProfile(userId);
    }

    if (!providerProfile) {
      return res.notFound('Provider profile not found');
    }

    const offset = (page - 1) * limit;
    const withdrawals = await getWithdrawals(providerProfile.id, providerType, {
      status,
      limit,
      offset
    });

    res.success(withdrawals);
  } catch (error) {
    console.error('Get withdrawals error:', error);
    res.serverError('Failed to get withdrawals');
  }
};

/**
 * Get withdrawal by ID
 */
exports.getWithdrawalById = async (req, res) => {
  try {
    const { id } = req.params;

    const withdrawal = await getWithdrawalById(id);
    if (!withdrawal) {
      return res.notFound('Withdrawal not found');
    }

    // Check ownership
    const userId = req.user.id;
    const providerType = req.user.role === 'CAREGIVER' ? 'CAREGIVER' : 'NURSE';
    
    let providerProfile;
    if (providerType === 'CAREGIVER') {
      providerProfile = await findCaregiverProfile(userId);
    } else {
      providerProfile = await findNurseProfile(userId);
    }

    if (req.user.role !== 'ADMIN' && (!providerProfile || withdrawal.provider_id !== providerProfile.id)) {
      return res.forbidden('Access denied');
    }

    res.success(withdrawal);
  } catch (error) {
    console.error('Get withdrawal error:', error);
    res.serverError('Failed to get withdrawal');
  }
};

/**
 * Admin: Get all withdrawals
 */
exports.getAllWithdrawals = async (req, res) => {
  try {
    const { status, provider_type, page = 1, limit = 20 } = req.query;

    const offset = (page - 1) * limit;
    const withdrawals = await getAllWithdrawals({
      status,
      provider_type,
      limit,
      offset
    });

    res.success(withdrawals);
  } catch (error) {
    console.error('Get all withdrawals error:', error);
    res.serverError('Failed to get withdrawals');
  }
};

/**
 * Admin: Approve withdrawal
 */
exports.approveWithdrawal = async (req, res) => {
  try {
    const { id } = req.params;
    const { transaction_id } = req.body;

    const withdrawal = await updateWithdrawalStatus(id, 'APPROVED', {
      processed_by: req.user.id,
      transaction_id
    });

    if (!withdrawal) {
      return res.notFound('Withdrawal not found');
    }

    res.success(withdrawal, 'Withdrawal approved successfully');
  } catch (error) {
    console.error('Approve withdrawal error:', error);
    res.serverError('Failed to approve withdrawal');
  }
};

/**
 * Admin: Reject withdrawal
 */
exports.rejectWithdrawal = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejection_reason } = req.body;

    if (!rejection_reason) {
      return res.badRequest('Rejection reason is required');
    }

    const withdrawal = await updateWithdrawalStatus(id, 'REJECTED', {
      processed_by: req.user.id,
      rejection_reason
    });

    if (!withdrawal) {
      return res.notFound('Withdrawal not found');
    }

    res.success(withdrawal, 'Withdrawal rejected successfully');
  } catch (error) {
    console.error('Reject withdrawal error:', error);
    res.serverError('Failed to reject withdrawal');
  }
};

/**
 * Admin: Complete withdrawal
 */
exports.completeWithdrawal = async (req, res) => {
  try {
    const { id } = req.params;

    const withdrawal = await updateWithdrawalStatus(id, 'COMPLETED', {
      processed_by: req.user.id
    });

    if (!withdrawal) {
      return res.notFound('Withdrawal not found');
    }

    res.success(withdrawal, 'Withdrawal completed successfully');
  } catch (error) {
    console.error('Complete withdrawal error:', error);
    res.serverError('Failed to complete withdrawal');
  }
};
