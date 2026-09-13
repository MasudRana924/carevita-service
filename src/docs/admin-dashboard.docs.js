/**
 * @swagger
 * /admin/dashboard:
 *   get:
 *     tags: [Admin]
 *     summary: Dashboard stats for charts
 *     responses:
 *       200:
 *         description: |
 *           total_bookings, pending_payment, paid, today_bookings, weekly_bookings,
 *           total_users, total_caregivers, caregiver_payment_done,
 *           platform_wallet_balance, total_paid_revenue, charts
 *
 * /caregiver/wallet:
 *   get:
 *     tags: [Caregiver]
 *     summary: Caregiver wallet balance + transactions (95% earnings)
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: offset
 *         schema: { type: integer, default: 0 }
 *     responses:
 *       200:
 *         description: { balance, currency, transactions }
 */
