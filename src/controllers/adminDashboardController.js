const pool = require('../config/database');
const { findById: findUserById } = require('../models/User');
const { publicUser } = require('../utils/serializers');

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
