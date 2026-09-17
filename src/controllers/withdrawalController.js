const Withdrawal = require('../models/Withdrawal');
const Wallet = require('../models/Wallet');
const { parsePagination } = require('../utils/pagination');
const { MIN_WITHDRAWAL_AMOUNT } = require('../config/platform');
const { writeAudit } = require('../utils/audit');
const { notifyUser } = require('../services/pushNotificationService');

exports.requestWithdrawal = async (req, res) => {
  try {
    const amount = Number(req.body.amount);
    const bkashNumber = String(req.body.bkash_number || '').trim();

    if (!(amount > 0)) return res.badRequest('amount must be greater than 0');
    if (amount < MIN_WITHDRAWAL_AMOUNT) {
      return res.badRequest(`Minimum withdrawal is BDT ${MIN_WITHDRAWAL_AMOUNT}`);
    }
    if (!bkashNumber) return res.badRequest('bkash_number is required');

    if (await Withdrawal.hasPending(req.user.id)) {
      return res.conflict('You already have a pending withdrawal request');
    }

    const wallet = await Wallet.getOrCreateWallet(null, {
      userId: req.user.id,
      ownerType: 'CAREGIVER'
    });
    if (Number(wallet.balance) < amount) {
      return res.error('Insufficient wallet balance', [], 400, 'BAD_REQUEST');
    }

    const withdrawal = await Withdrawal.createWithdrawal({
      caregiverUserId: req.user.id,
      walletId: wallet.id,
      amount,
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

    const pool = require('../config/database');
    const dbClient = await pool.connect();
    let updated;
    try {
      await dbClient.query('BEGIN');
      await Wallet.debit(dbClient, {
        walletId: withdrawal.wallet_id,
        userId: withdrawal.caregiver_user_id,
        amount: Number(withdrawal.amount),
        category: 'WITHDRAWAL',
        description: `Withdrawal ${withdrawal.id} to ${withdrawal.bkash_number}`,
        meta: { withdrawal_id: withdrawal.id, bkash_number: withdrawal.bkash_number }
      });
      const result = await dbClient.query(
        `
        UPDATE withdrawals
        SET status = 'COMPLETED',
            admin_note = COALESCE($1, admin_note),
            processed_by = $2,
            processed_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
        RETURNING *
        `,
        [req.body.note || 'Paid to bKash wallet', req.user.id, withdrawal.id]
      );
      updated = result.rows[0];
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
      meta: { amount: withdrawal.amount }
    });

    try {
      await notifyUser({
        userId: withdrawal.caregiver_user_id,
        title: 'Withdrawal completed',
        body: `BDT ${withdrawal.amount} was sent to ${withdrawal.bkash_number}.`,
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
    if (withdrawal.status !== 'PENDING') {
      return res.error('Only pending withdrawals can be rejected');
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
      meta: { note: req.body.note }
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
