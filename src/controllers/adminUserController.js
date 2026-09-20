const {
  findAll: findAllUsers,
  adminUpdateUser,
  countAll: countAllUsers
} = require('../models/User');
const { createNotification } = require('../models/Notification');
const { parsePagination } = require('../utils/pagination');
const { writeAudit } = require('../utils/audit');

exports.getAllUsers = async (req, res) => {
  try {
    const { role, status } = req.query;
    const { page, limit, offset } = parsePagination(req.query);

    const [users, total] = await Promise.all([
      findAllUsers({
        role: role || undefined,
        status,
        limit,
        offset
      }),
      countAllUsers({
        role: role || undefined,
        status
      })
    ]);

    const data = users.filter((u) => u.role !== 'ADMIN' || role === 'ADMIN');
    return res.paginated(data, { page, limit, total }, 'Users fetched successfully');
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
    await writeAudit({
      actorId: req.user.id,
      action: 'USER_BLOCKED',
      entityType: 'user',
      entityId: req.params.id
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
    await writeAudit({
      actorId: req.user.id,
      action: 'USER_UNBLOCKED',
      entityType: 'user',
      entityId: req.params.id
    });
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
