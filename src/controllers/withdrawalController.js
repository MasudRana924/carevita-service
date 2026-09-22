const Withdrawal = require('../models/Withdrawal');
const Wallet = require('../models/Wallet');
const { parsePagination } = require('../utils/pagination');
const { MIN_WITHDRAWAL_AMOUNT } = require('../config/platform');
const { writeAudit } = require('../utils/audit');
const { notifyUser } = require('../services/pushNotificationService');
const {
  listDeliveryMethods,
  getDeliveryMethodFields,
  validateDeliveryDetails
} = require('../constants/withdrawalDelivery');

const payoutDestinationLabel = (withdrawal) => {
  const details = withdrawal.delivery_details || {};
  if (withdrawal.method === 'BANK') {
    return `${details.bank_name || 'Bank'} · ${details.account_number || ''}`.trim();
  }
  if (withdrawal.method === 'MFS') {
    const provider = details.mfs_provider || 'MFS';
    return `${provider} · ${details.wallet_number || withdrawal.bkash_number || ''}`.trim();
  }
  return withdrawal.bkash_number || 'wallet';
};

exports.listDeliveryMethods = async (req, res) => {
  try {
    return res.success(
      { methods: listDeliveryMethods() },
      'Delivery methods fetched successfully'
    );
  } catch (error) {
    console.error('List delivery methods error:', error);
    return res.serverError('Failed to fetch delivery methods');
  }
};

exports.getDeliveryMethodFields = async (req, res) => {
  try {
    const method = req.params.method || req.query.method;
    const config = getDeliveryMethodFields(method);
    if (!config) {
      return res.badRequest('Invalid delivery method. Use MFS or BANK.');
    }
    return res.success(config, 'Delivery method fields fetched successfully');
  } catch (error) {
    console.error('Get delivery fields error:', error);
    return res.serverError('Failed to fetch delivery fields');
  }
};

exports.requestWithdrawal = async (req, res) => {
  try {
    const amount = Number(req.body.amount);
    const method = String(req.body.method || '').trim().toUpperCase();
    // Support both nested delivery_details and flat body fields
    const rawDetails = req.body.delivery_details && typeof req.body.delivery_details === 'object'
      ? req.body.delivery_details
      : {
          account_name: req.body.account_name,
          wallet_number: req.body.wallet_number || req.body.bkash_number,
          mfs_provider: req.body.mfs_provider,
          bank_name: req.body.bank_name,
          branch_name: req.body.branch_name,
          account_number: req.body.account_number,
          routing_number: req.body.routing_number,
          account_holder_name: req.body.account_holder_name
        };

    if (!(amount > 0)) return res.badRequest('amount must be greater than 0');
    if (amount < MIN_WITHDRAWAL_AMOUNT) {
      return res.badRequest(`Minimum withdrawal is BDT ${MIN_WITHDRAWAL_AMOUNT}`);
    }
    if (!method) return res.badRequest('method is required (MFS or BANK)');

    const validated = validateDeliveryDetails(method, rawDetails);
    if (!validated.ok) return res.badRequest(validated.error);

    if (await Withdrawal.hasPending(req.user.id)) {
      return res.conflict('You already have a pending withdrawal request');
    }

    if (await Withdrawal.hasPayoutFreeze(req.user.id)) {
      return res.error(
        'Withdrawals are temporarily frozen due to a safety review on one of your bookings. Contact support.',
        [],
        403,
        'FORBIDDEN'
      );
    }

    const wallet = await Wallet.getOrCreateWallet(null, {
      userId: req.user.id,
      ownerType: 'CAREGIVER'
    });
    if (Number(wallet.balance) < amount) {
      return res.error('Insufficient wallet balance', [], 400, 'BAD_REQUEST');
    }

    // Keep bkash_number populated for MFS (admin/legacy display)
    const bkashNumber =
      validated.method === 'MFS' ? validated.deliveryDetails.wallet_number : null;

    const withdrawal = await Withdrawal.createWithdrawal({
      caregiverUserId: req.user.id,
      walletId: wallet.id,
      amount,
      method: validated.method,
      deliveryDetails: validated.deliveryDetails,
      bkashNumber
    });

    return res.created(withdrawal, 'Withdrawal requested');
  } catch (error) {
    console.error('Request withdrawal error:', error);
    return res.serverError('Failed to request withdrawal');
  }
};

exports.myWithdrawals = async (req, res) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const [items, total] = await Promise.all([
      Withdrawal.listByUser(req.user.id, { limit, offset }),
      Withdrawal.countByUser(req.user.id)
    ]);
    return res.paginated(items, { page, limit, total }, 'Withdrawals fetched successfully');
  } catch (error) {
    console.error('List withdrawals error:', error);
    return res.serverError('Failed to fetch withdrawals');
  }
};

exports.adminListWithdrawals = async (req, res) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { items, total } = await Withdrawal.listAll({
      status: req.query.status,
      limit,
      offset
    });
    return res.paginated(items, { page, limit, total }, 'Withdrawals fetched successfully');
  } catch (error) {
    console.error('Admin list withdrawals error:', error);
    return res.serverError('Failed to fetch withdrawals');
  }
};

exports.adminApproveWithdrawal = async (req, res) => {
  try {
    const withdrawal = await Withdrawal.findById(req.params.id);
    if (!withdrawal) return res.notFound('Withdrawal not found');
    if (withdrawal.status !== 'PENDING') {
      return res.error('Only pending withdrawals can be approved');
    }

    if (await Withdrawal.hasPayoutFreeze(withdrawal.caregiver_user_id)) {
      return res.error(
        'Cannot approve: caregiver payout is frozen due to a safety incident',
        [],
        409,
        'CONFLICT'
      );
    }

    const destination = payoutDestinationLabel(withdrawal);
    const pool = require('../config/database');
    const dbClient = await pool.connect();
    let updated;
    try {
      await dbClient.query('BEGIN');

      const claimed = await dbClient.query(
        `
        UPDATE withdrawals
        SET status = 'PROCESSING',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND status = 'PENDING'
        RETURNING *
        `,
        [withdrawal.id]
      );
      if (!claimed.rowCount) {
        await dbClient.query('ROLLBACK');
        return res.error('Withdrawal already processed');
      }

      await dbClient.query(`SELECT id FROM wallets WHERE id = $1 FOR UPDATE`, [withdrawal.wallet_id]);

      await Wallet.debit(dbClient, {
        walletId: withdrawal.wallet_id,
        userId: withdrawal.caregiver_user_id,
        amount: Number(withdrawal.amount),
        category: 'WITHDRAWAL',
        description: `Withdrawal ${withdrawal.id} to ${destination}`,
        meta: {
          withdrawal_id: withdrawal.id,
          method: withdrawal.method,
          delivery_details: withdrawal.delivery_details,
          bkash_number: withdrawal.bkash_number
        }
      });
      const result = await dbClient.query(
        `
        UPDATE withdrawals
        SET status = 'COMPLETED',
            admin_note = COALESCE($1, admin_note),
            processed_by = $2,
            processed_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $3 AND status = 'PROCESSING'
        RETURNING *
        `,
        [req.body.note || `Paid via ${withdrawal.method || 'MFS'} to ${destination}`, req.user.id, withdrawal.id]
      );
      updated = result.rows[0];
      if (!updated) {
        throw new Error('Failed to finalize withdrawal');
      }
      await dbClient.query('COMMIT');
    } catch (err) {
      await dbClient.query('ROLLBACK');
      throw err;
    } finally {
      dbClient.release();
    }

    await writeAudit({
      actorId: req.user.id,
      action: 'WITHDRAWAL_APPROVED',
      entityType: 'withdrawal',
      entityId: withdrawal.id,
      meta: { amount: withdrawal.amount, method: withdrawal.method }
    });

    try {
      await notifyUser({
        userId: withdrawal.caregiver_user_id,
        title: 'Withdrawal completed',
        body: `BDT ${withdrawal.amount} was sent to ${destination}.`,
        type: 'WITHDRAWAL_UPDATED',
        referenceId: withdrawal.id,
        referenceType: 'withdrawal'
      });
    } catch (e) {
      console.error('Withdrawal notify failed:', e.message);
    }

    return res.success(updated, 'Withdrawal approved and marked completed');
  } catch (error) {
    console.error('Approve withdrawal error:', error);
    return res.error(error.message || 'Failed to approve withdrawal', [], 400);
  }
};

exports.adminRejectWithdrawal = async (req, res) => {
  try {
    const withdrawal = await Withdrawal.findById(req.params.id);
    if (!withdrawal) return res.notFound('Withdrawal not found');
    // Allow rejecting stuck PROCESSING (failed mid-approve) as well as PENDING
    if (!['PENDING', 'PROCESSING'].includes(withdrawal.status)) {
      return res.error('Only pending/processing withdrawals can be rejected');
    }

    const updated = await Withdrawal.updateStatus(withdrawal.id, {
      status: 'REJECTED',
      adminNote: req.body.note || 'Rejected by admin',
      processedBy: req.user.id
    });

    await writeAudit({
      actorId: req.user.id,
      action: 'WITHDRAWAL_REJECTED',
      entityType: 'withdrawal',
      entityId: withdrawal.id,
      meta: { note: req.body.note, previous_status: withdrawal.status }
    });

    try {
      await notifyUser({
        userId: withdrawal.caregiver_user_id,
        title: 'Withdrawal rejected',
        body: req.body.note || 'Your withdrawal request was rejected.',
        type: 'WITHDRAWAL_UPDATED',
        referenceId: withdrawal.id,
        referenceType: 'withdrawal'
      });
    } catch (e) {
      console.error('Withdrawal notify failed:', e.message);
    }

    return res.success(updated, 'Withdrawal rejected');
  } catch (error) {
    console.error('Reject withdrawal error:', error);
    return res.serverError('Failed to reject withdrawal');
  }
};
