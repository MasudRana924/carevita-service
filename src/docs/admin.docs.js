/**
 * @swagger
 * /admin/profile:
 *   get:
 *     tags: [Admin]
 *     summary: Admin profile
 *     responses:
 *       200:
 *         description: Profile
 *
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
 *     summary: List users
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Users
 *
 * /admin/users/{id}/block:
 *   put:
 *     tags: [Admin]
 *     summary: Block user
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Blocked
 *
 * /admin/users/{id}/unblock:
 *   put:
 *     tags: [Admin]
 *     summary: Unblock user
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Unblocked
 *
 * /admin/caregivers:
 *   get:
 *     tags: [Admin]
 *     summary: List caregivers
 *     responses:
 *       200:
 *         description: Caregivers
 *
 * /admin/caregivers/{id}/block:
 *   put:
 *     tags: [Admin]
 *     summary: Block caregiver
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Blocked
 *
 * /admin/caregivers/{id}/unblock:
 *   put:
 *     tags: [Admin]
 *     summary: Unblock caregiver
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Unblocked
 *
 * /admin/hospitals:
 *   get:
 *     tags: [Admin]
 *     summary: List hospitals
 *     responses:
 *       200:
 *         description: Hospitals
 *   post:
 *     tags: [Admin]
 *     summary: Create hospital
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *               district: { type: string }
 *               city: { type: string }
 *               address: { type: string }
 *               phone: { type: string }
 *               photo: { type: string, format: binary }
 *     responses:
 *       201:
 *         description: Created
 *
 * /admin/hospitals/{id}:
 *   put:
 *     tags: [Admin]
 *     summary: Update hospital
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Updated
 */
