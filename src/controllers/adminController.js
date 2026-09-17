const pool = require('../config/database');
const { searchCaregivers } = require('../models/CaregiverProfile');
const { createNotification } = require('../models/Notification');
const {
  findAll: findAllUsers,
  findById: findUserById,
  adminUpdateUser,
  countAll: countAllUsers
} = require('../models/User');
const { publicUser } = require('../utils/serializers');
const { parsePagination } = require('../utils/pagination');
const { writeAudit } = require('../utils/audit');
const {
  findById: findHospitalById,
  updateHospital
} = require('../models/Hospital');

exports.getAdminProfile = async (req, res) => {
  try {
    const user = await findUserById(req.user.id);
    if (!user) return res.notFound('Admin not found');
    return res.success(publicUser(user), 'Admin profile fetched successfully');
  } catch (error) {
    console.error('Get admin profile error:', error);
    res.serverError('Failed to fetch admin profile');
  }
};

exports.getDashboardStats = async (req, res) => {
  try {
    const [
      usersResult,
      caregiversResult,
      bookingsResult,
      pendingPayResult,
      paidResult,
      todayResult,
      weeklyResult,
      caregiverPaidResult,
      platformWalletResult,
      chartBookings,
      chartPayments
    ] = await Promise.all([
      pool.query(`SELECT COUNT(*)::int AS count FROM users WHERE role = 'USER'`),
      pool.query(`SELECT COUNT(*)::int AS count FROM users WHERE role = 'CAREGIVER'`),
      pool.query(`SELECT COUNT(*)::int AS count FROM bookings`),
      pool.query(`
        SELECT COUNT(*)::int AS count FROM bookings
        WHERE UPPER(COALESCE(payment_status, 'PENDING')) IN ('PENDING', 'UNPAID', 'FAILED', '')
      `),
      pool.query(`
        SELECT COUNT(*)::int AS count FROM bookings
        WHERE UPPER(COALESCE(payment_status, '')) = 'PAID'
      `),
      pool.query(`
        SELECT COUNT(*)::int AS count FROM bookings
        WHERE booking_date = CURRENT_DATE
           OR created_at::date = CURRENT_DATE
      `),
      pool.query(`
        SELECT COUNT(*)::int AS count FROM bookings
        WHERE created_at >= (CURRENT_TIMESTAMP - INTERVAL '7 days')
      `),
      pool.query(`
        SELECT COUNT(*)::int AS count FROM bookings
        WHERE UPPER(COALESCE(payment_status, '')) = 'PAID'
          AND provider_type = 'CAREGIVER'
          AND provider_id IS NOT NULL
      `),
      pool.query(`
        SELECT COALESCE(balance, 0)::float AS balance
        FROM wallets
        WHERE owner_type = 'PLATFORM'
        LIMIT 1
      `),
      pool.query(`
        SELECT d::date AS date, COUNT(b.id)::int AS count
        FROM generate_series(
          (CURRENT_DATE - INTERVAL '6 days')::date,
          CURRENT_DATE,
          '1 day'::interval
        ) AS d
        LEFT JOIN bookings b ON b.created_at::date = d::date
        GROUP BY d
        ORDER BY d
      `),
      pool.query(`
        SELECT d::date AS date,
               COUNT(*) FILTER (
                 WHERE UPPER(COALESCE(b.payment_status, '')) = 'PAID'
               )::int AS paid,
               COUNT(*) FILTER (
                 WHERE UPPER(COALESCE(b.payment_status, 'PENDING')) IN ('PENDING', 'UNPAID', 'FAILED', '')
               )::int AS pending
        FROM generate_series(
          (CURRENT_DATE - INTERVAL '6 days')::date,
          CURRENT_DATE,
          '1 day'::interval
        ) AS d
        LEFT JOIN bookings b ON b.created_at::date = d::date
        GROUP BY d
        ORDER BY d
      `)
    ]);

    const paidRevenue = await pool.query(`
      SELECT COALESCE(SUM(amount), 0)::float AS total
      FROM payments
      WHERE status = 'COMPLETED'
    `);

    res.success({
      total_bookings: bookingsResult.rows[0].count,
      pending_payment: pendingPayResult.rows[0].count,
      paid: paidResult.rows[0].count,
      today_bookings: todayResult.rows[0].count,
      weekly_bookings: weeklyResult.rows[0].count,
      total_users: usersResult.rows[0].count,
      total_caregivers: caregiversResult.rows[0].count,
      caregiver_payment_done: caregiverPaidResult.rows[0].count,
      platform_wallet_balance: platformWalletResult.rows[0]?.balance || 0,
      total_paid_revenue: paidRevenue.rows[0].total,
      // camelCase aliases for existing admin clients
      totalUsers: usersResult.rows[0].count,
      totalBookings: bookingsResult.rows[0].count,
      todayBookings: todayResult.rows[0].count,
      totalCaregivers: caregiversResult.rows[0].count,
      charts: {
        bookings_last_7_days: chartBookings.rows.map((r) => ({
          date: r.date,
          count: r.count
        })),
        payments_last_7_days: chartPayments.rows.map((r) => ({
          date: r.date,
          paid: r.paid,
          pending: r.pending
        }))
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.serverError('Failed to fetch dashboard stats');
  }
};

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

exports.getAllCaregivers = async (req, res) => {
  try {
    const { verification_status } = req.query;
    const { page, limit } = parsePagination(req.query);
    const { items, total } = await searchCaregivers({
      verification_status,
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
    const { district } = req.query;
    const { page, limit, offset } = parsePagination(req.query);
    let query = 'SELECT * FROM hospitals WHERE 1=1';
    const values = [];
    let paramCount = 0;

    if (district) {
      paramCount++;
      query += ` AND district = $${paramCount}`;
      values.push(district);
    }

    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*)::int AS count');
    query += ` ORDER BY name LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    values.push(limit, offset);

    const [result, countResult] = await Promise.all([
      pool.query(query, values),
      pool.query(countQuery, values.slice(0, paramCount))
    ]);

    return res.paginated(result.rows, {
      page,
      limit,
      total: countResult.rows[0].count
    }, 'Hospitals fetched successfully');
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
