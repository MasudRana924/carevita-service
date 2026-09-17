/**
 * @swagger
 * /bookings/{id}/dispute:
 *   post:
 *     tags: [Bookings]
 *     summary: Open a dispute on a paid booking
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [reason]
 *             properties:
 *               reason: { type: string, example: Caregiver did not arrive }
 *               details: { type: string }
 *     responses:
 *       201:
 *         $ref: '#/components/responses/Success'
 *
 * /bookings/{id}/disputes:
 *   get:
 *     tags: [Bookings]
 *     summary: List disputes for a booking
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         $ref: '#/components/responses/Success'
 *
 * /caregiver/availability:
 *   get:
 *     tags: [Caregiver]
 *     summary: Get my weekly availability
 *     responses:
 *       200:
 *         $ref: '#/components/responses/Success'
 *   put:
 *     tags: [Caregiver]
 *     summary: Replace weekly availability slots
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               slots:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     day_of_week: { type: integer, example: 1, description: 0=Sunday }
 *                     start_time: { type: string, example: "09:00" }
 *                     end_time: { type: string, example: "18:00" }
 *                     is_active: { type: boolean, example: true }
 *     responses:
 *       200:
 *         $ref: '#/components/responses/Success'
 *
 * /caregiver/withdrawals:
 *   post:
 *     tags: [Caregiver]
 *     summary: Request wallet withdrawal to bKash
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount, bkash_number]
 *             properties:
 *               amount: { type: number, example: 500 }
 *               bkash_number: { type: string, example: "01700000000" }
 *     responses:
 *       201:
 *         $ref: '#/components/responses/Success'
 *   get:
 *     tags: [Caregiver]
 *     summary: List my withdrawals
 *     responses:
 *       200:
 *         $ref: '#/components/responses/Success'
 *
 * /notifications/preferences:
 *   get:
 *     tags: [Notifications]
 *     summary: Get push mute preferences
 *     responses:
 *       200:
 *         $ref: '#/components/responses/Success'
 *   put:
 *     tags: [Notifications]
 *     summary: Update push mute preferences
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               types:
 *                 type: object
 *                 additionalProperties: { type: boolean }
 *                 example: { BOOKING_CREATED: true, SERVICE_START_REMINDER: false }
 *     responses:
 *       200:
 *         $ref: '#/components/responses/Success'
 *
 * /payments/bkash/query:
 *   post:
 *     tags: [Payments]
 *     summary: Query bKash payment status
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [paymentID]
 *             properties:
 *               paymentID: { type: string }
 *     responses:
 *       200:
 *         $ref: '#/components/responses/Success'
 *
 * /payments/bkash/refund:
 *   post:
 *     tags: [Payments]
 *     summary: Admin full or partial bKash refund (up to 10 times)
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               paymentId: { type: string, description: bKash paymentId from create payment }
 *               booking_id: { type: string, format: uuid }
 *               refundAmount: { type: string, example: "1.00" }
 *               sku: { type: string, maxLength: 255 }
 *               reason: { type: string, maxLength: 255 }
 *     responses:
 *       200:
 *         $ref: '#/components/responses/Success'
 *
 * /payments/bkash/refund/status:
 *   post:
 *     tags: [Payments]
 *     summary: Check bKash refund status list for a transaction
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               paymentId: { type: string }
 *               booking_id: { type: string, format: uuid }
 *     responses:
 *       200:
 *         $ref: '#/components/responses/Success'
 *
 * /admin/bookings:
 *   get:
 *     tags: [Admin]
 *     summary: List all bookings
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         $ref: '#/components/responses/Success'
 *
 * /admin/disputes:
 *   get:
 *     tags: [Admin]
 *     summary: List disputes
 *     responses:
 *       200:
 *         $ref: '#/components/responses/Success'
 *
 * /admin/disputes/{id}:
 *   patch:
 *     tags: [Admin]
 *     summary: Update dispute status
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
 *             required: [status]
 *             properties:
 *               status: { type: string, example: RESOLVED }
 *               resolution: { type: string }
 *     responses:
 *       200:
 *         $ref: '#/components/responses/Success'
 *
 * /admin/withdrawals:
 *   get:
 *     tags: [Admin]
 *     summary: List caregiver withdrawals
 *     responses:
 *       200:
 *         $ref: '#/components/responses/Success'
 *
 * /admin/withdrawals/{id}/approve:
 *   post:
 *     tags: [Admin]
 *     summary: Approve withdrawal and debit caregiver wallet
 *     responses:
 *       200:
 *         $ref: '#/components/responses/Success'
 *
 * /admin/withdrawals/{id}/reject:
 *   post:
 *     tags: [Admin]
 *     summary: Reject withdrawal
 *     responses:
 *       200:
 *         $ref: '#/components/responses/Success'
 *
 * /admin/audit-logs:
 *   get:
 *     tags: [Admin]
 *     summary: List audit trail
 *     responses:
 *       200:
 *         $ref: '#/components/responses/Success'
 */
