/**
 * @swagger
 * tags:
 *   - name: Payments
 *     description: bKash checkout (sandbox)
 *
 * /payments/bkash/token:
 *   post:
 *     tags: [Payments]
 *     summary: Grant bKash id_token and store per user
 *     responses:
 *       200:
 *         description: { id_token, expires_at, script }
 *
 * /payments/bkash/create:
 *   post:
 *     tags: [Payments]
 *     summary: Create bKash payment (Pay Now) for accepted booking
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [booking_id]
 *             properties:
 *               booking_id: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: paymentID, bkashURL, amount, script
 *
 * /payments/bkash/execute:
 *   post:
 *     tags: [Payments]
 *     summary: Execute bKash payment after checkout confirm
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [paymentID]
 *             properties:
 *               paymentID: { type: string }
 *               booking_id: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Booking marked PAID; caregiver notified
 */
