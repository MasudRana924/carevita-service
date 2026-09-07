/**
 * @swagger
 * /user/profile:
 *   get:
 *     tags: [User]
 *     summary: Get my profile
 *     responses:
 *       200:
 *         description: Current user profile
 *   put:
 *     tags: [User]
 *     summary: Update my profile (optional photo)
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               email: { type: string, format: email }
 *               phone: { type: string }
 *               language_preference: { type: string }
 *               emergency_contact: { type: string }
 *               address: { type: string }
 *               date_of_birth: { type: string, format: date }
 *               profile_photo:
 *                 type: string
 *                 format: binary
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               email: { type: string }
 *               phone: { type: string }
 *               language_preference: { type: string }
 *               emergency_contact: { type: string }
 *               address: { type: string }
 *               date_of_birth: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Profile updated
 *
 * /user/avatar:
 *   post:
 *     tags: [User]
 *     summary: Upload avatar
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [avatar]
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Avatar uploaded
 *
 * /user/bookings:
 *   get:
 *     tags: [User]
 *     summary: List my bookings
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Bookings list
 *
 * /user/payments:
 *   get:
 *     tags: [User]
 *     summary: List my payments
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Payments list
 *
 * /user/notifications:
 *   get:
 *     tags: [User]
 *     summary: List my notifications
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: is_read
 *         schema: { type: boolean }
 *     responses:
 *       200:
 *         description: Notifications list
 *
 * /user/notifications/read-all:
 *   post:
 *     tags: [User]
 *     summary: Mark all notifications as read
 *     responses:
 *       200:
 *         description: All marked as read
 */
