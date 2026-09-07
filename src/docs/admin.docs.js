/**
 * @swagger
 * /admin/dashboard:
 *   get:
 *     tags: [Admin]
 *     summary: Dashboard stats
 *     responses:
 *       200:
 *         description: Stats
 *
 * /admin/users:
 *   get:
 *     tags: [Admin]
 *     summary: List all users
 *     parameters:
 *       - in: query
 *         name: role
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Users list
 *
 * /admin/users/{id}/status:
 *   put:
 *     tags: [Admin]
 *     summary: Update user status
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
 *             required: [status]
 *             properties:
 *               status: { type: string, example: active }
 *     responses:
 *       200:
 *         description: Updated
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
 *         name: provider_type
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Bookings
 *
 * /admin/providers:
 *   get:
 *     tags: [Admin]
 *     summary: List providers
 *     parameters:
 *       - in: query
 *         name: provider_type
 *         schema: { type: string }
 *       - in: query
 *         name: verification_status
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Providers
 *
 * /admin/providers/{id}/verify:
 *   put:
 *     tags: [Admin]
 *     summary: Verify / reject provider
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
 *               provider_type: { type: string }
 *               verification_status: { type: string, example: VERIFIED }
 *               note: { type: string }
 *     responses:
 *       200:
 *         description: Updated
 *
 * /admin/documents/pending:
 *   get:
 *     tags: [Admin]
 *     summary: Pending documents
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Pending documents
 *
 * /admin/documents/{id}/verify:
 *   put:
 *     tags: [Admin]
 *     summary: Verify document
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
 *               verification_status: { type: string }
 *               note: { type: string }
 *     responses:
 *       200:
 *         description: Verified
 *
 * /admin/payments:
 *   get:
 *     tags: [Admin]
 *     summary: All payments
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *       - in: query
 *         name: payment_method
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Payments
 *
 * /admin/hospitals:
 *   post:
 *     tags: [Admin]
 *     summary: Create hospital
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               address: { type: string }
 *               phone: { type: string }
 *               email: { type: string }
 *               location_lat: { type: number }
 *               location_long: { type: number }
 *               city: { type: string }
 *               district: { type: string }
 *               type: { type: string }
 *               details: { type: string }
 *               photo:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Created
 *   get:
 *     tags: [Admin]
 *     summary: List hospitals
 *     security: []
 *     parameters:
 *       - in: query
 *         name: district
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Hospitals
 *
 * /admin/hospitals/{id}/status:
 *   put:
 *     tags: [Admin]
 *     summary: Update hospital active status
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
 *               is_active: { type: boolean }
 *     responses:
 *       200:
 *         description: Updated
 *
 * /admin/revenue:
 *   get:
 *     tags: [Admin]
 *     summary: Revenue stats
 *     parameters:
 *       - in: query
 *         name: date_from
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: date_to
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Revenue stats
 */
