/**
 * @swagger
 * /user/me:
 *   get:
 *     tags: [User]
 *     summary: My account details (USER and CAREGIVER)
 *     responses:
 *       200:
 *         description: "{ id, role, name, email, phone, profile_photo, gender, date_of_birth, address, emergency_contact, language_preference, status, is_verified, ekyc_status, caregiver_profile_id, created_at, updated_at }"
 *   put:
 *     tags: [User]
 *     summary: Update my profile fields (no photo, email or phone)
 *     description: Send only the fields that changed. For caregivers, gender and date_of_birth are also copied to the caregiver profile.
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string, maxLength: 255 }
 *               gender: { type: string, enum: [male, female, other] }
 *               date_of_birth: { type: string, format: date, example: "1995-04-20" }
 *               address: { type: string, maxLength: 500 }
 *               emergency_contact: { type: string, maxLength: 20 }
 *               language_preference: { type: string, enum: [bn, en] }
 *     responses:
 *       200:
 *         description: Updated account (same shape as GET /user/me)
 *       400:
 *         description: VALIDATION_ERROR
 *
 * /user/me/photo:
 *   post:
 *     tags: [User]
 *     summary: Update my profile photo only (USER and CAREGIVER). PUT is also accepted, but mobile apps should use POST.
 *     description: Image is cropped to 800x800. For caregivers the photo is also shown on search and booking cards.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [photo]
 *             properties:
 *               photo: { type: string, format: binary, description: "JPEG, PNG or WEBP, max 5MB" }
 *     responses:
 *       200:
 *         description: Updated account (same shape as GET /user/me)
 *       400:
 *         description: Missing file, wrong type or larger than 5MB
 *
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
 * /user/notifications/unread-count:
 *   get:
 *     tags: [User]
 *     summary: Unread notification count
 *     responses:
 *       200:
 *         description: "{ unread: number }"
 *
 * /user/notifications/{id}:
 *   get:
 *     tags: [User]
 *     summary: One notification
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Notification
 *
 * /user/notifications/{id}/read:
 *   put:
 *     tags: [User]
 *     summary: Mark one notification as read
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Marked read
 *
 * /user/notifications/read-all:
 *   post:
 *     tags: [User]
 *     summary: Mark all notifications as read
 *     responses:
 *       200:
 *         description: All marked as read
 */
