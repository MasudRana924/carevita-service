/**
 * @swagger
 * /payments/bkash:
 *   post:
 *     tags: [Payments]
 *     summary: Create bKash payment
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [booking_id]
 *             properties:
 *               booking_id: { type: string, format: uuid }
 *               payment_type: { type: string, example: ADVANCE }
 *     responses:
 *       200:
 *         description: Payment created — returns payment URL / paymentID
 *
 * /payments/bkash/callback:
 *   get:
 *     tags: [Payments]
 *     summary: bKash payment callback
 *     security: []
 *     parameters:
 *       - in: query
 *         name: paymentID
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *       - in: query
 *         name: transactionId
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Callback processed
 *
 * /payments/execute:
 *   post:
 *     tags: [Payments]
 *     summary: Execute bKash payment
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [paymentID]
 *             properties:
 *               paymentID: { type: string }
 *     responses:
 *       200:
 *         description: Payment executed
 *
 * /payments/verify:
 *   post:
 *     tags: [Payments]
 *     summary: Verify payment
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [paymentID]
 *             properties:
 *               paymentID: { type: string }
 *     responses:
 *       200:
 *         description: Payment verified
 *
 * /payments:
 *   get:
 *     tags: [Payments]
 *     summary: List my payments
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *       - in: query
 *         name: payment_method
 *         schema: { type: string }
 *       - in: query
 *         name: date_from
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: date_to
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Payments list
 *
 * /payments/{id}:
 *   get:
 *     tags: [Payments]
 *     summary: Get payment by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Payment details
 *
 * /payments/{id}/refund:
 *   post:
 *     tags: [Payments]
 *     summary: Refund payment
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason: { type: string }
 *     responses:
 *       200:
 *         description: Refunded
 */
