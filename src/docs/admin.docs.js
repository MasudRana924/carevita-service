/**
 * @swagger
 * /admin/users:
 *   get:
 *     tags: [Admin]
 *     summary: List all users
 *     parameters:
 *       - in: query
 *         name: role
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *       - in: query
 *         name: is_verified
 *         schema: { type: boolean }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Users (includes ekyc_status, is_verified)
 *
 * /admin/users/{id}:
 *   put:
 *     tags: [Admin]
 *     summary: Update user (verified, ekyc_status, status, role)
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
 *               status: { type: string, example: active }
 *               is_verified: { type: boolean }
 *               ekyc_status: { type: boolean }
 *               role: { type: string }
 *     responses:
 *       200:
 *         description: User updated
 *   delete:
 *     tags: [Admin]
 *     summary: Delete user account
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Deleted
 *
 * /admin/users/{id}/status:
 *   put:
 *     tags: [Admin]
 *     summary: Update user status only
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
 *               status: { type: string }
 *     responses:
 *       200:
 *         description: Updated
 *
 * /admin/nurses:
 *   get:
 *     tags: [Admin]
 *     summary: List all nurses
 *     parameters:
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
 *         description: Nurses list
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
 * /admin/medicines:
 *   get:
 *     tags: [Admin]
 *     summary: List all medicines
 *     parameters:
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *       - in: query
 *         name: is_active
 *         schema: { type: boolean }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Medicines
 *   post:
 *     tags: [Admin]
 *     summary: Create medicine
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *               generic_name: { type: string }
 *               manufacturer: { type: string }
 *               category: { type: string }
 *               description: { type: string }
 *               strength: { type: string }
 *               form: { type: string }
 *               is_prescription_required: { type: boolean }
 *     responses:
 *       201:
 *         description: Created
 *
 * /admin/medicines/{id}:
 *   put:
 *     tags: [Admin]
 *     summary: Update medicine
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
 *               name: { type: string }
 *               generic_name: { type: string }
 *               manufacturer: { type: string }
 *               category: { type: string }
 *               description: { type: string }
 *               strength: { type: string }
 *               form: { type: string }
 *               is_prescription_required: { type: boolean }
 *               is_active: { type: boolean }
 *     responses:
 *       200:
 *         description: Updated
 *   delete:
 *     tags: [Admin]
 *     summary: Delete medicine
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Deleted
 *
 * /admin/orders:
 *   get:
 *     tags: [Admin]
 *     summary: List all medicine orders
 *     parameters:
 *       - in: query
 *         name: status
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
 *         description: Orders
 *
 * /admin/orders/{id}:
 *   get:
 *     tags: [Admin]
 *     summary: Get order by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Order details
 *
 * /admin/orders/{id}/status:
 *   put:
 *     tags: [Admin]
 *     summary: Update order status (notifies customer)
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
 *               status: { type: string, example: processing, description: pending|processing|shipped|delivered|cancelled }
 *               payment_status: { type: string, example: paid }
 *     responses:
 *       200:
 *         description: Order updated
 */
