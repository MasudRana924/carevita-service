/**
 * @swagger
 * /caregiver/profile:
 *   post:
 *     tags: [Caregiver]
 *     summary: Create caregiver profile
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               bio: { type: string }
 *               experience_years: { type: integer }
 *               service_areas: { type: string, description: JSON array or comma-separated }
 *               hourly_rate: { type: number }
 *               education: { type: string }
 *               blood_group: { type: string }
 *               date_of_birth: { type: string, format: date }
 *               gender: { type: string }
 *               profile_photo:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Profile created
 *   get:
 *     tags: [Caregiver]
 *     summary: Get my caregiver profile
 *     responses:
 *       200:
 *         description: Profile
 *   put:
 *     tags: [Caregiver]
 *     summary: Update caregiver profile
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               bio: { type: string }
 *               experience_years: { type: integer }
 *               service_areas: { type: string }
 *               hourly_rate: { type: number }
 *               is_available: { type: boolean }
 *               education: { type: string }
 *               blood_group: { type: string }
 *               date_of_birth: { type: string, format: date }
 *               gender: { type: string }
 *               profile_photo:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Updated
 *
 * /caregiver/documents:
 *   post:
 *     tags: [Caregiver]
 *     summary: Submit verification document
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [document_type]
 *             properties:
 *               document_type: { type: string, example: NID }
 *     responses:
 *       200:
 *         description: Document submitted
 *
 * /caregiver/availability:
 *   get:
 *     tags: [Caregiver]
 *     summary: Get my availability
 *     parameters:
 *       - in: query
 *         name: date_from
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: date_to
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Availability slots
 *   post:
 *     tags: [Caregiver]
 *     summary: Set availability
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               is_available: { type: boolean }
 *               slots:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: Availability set
 *
 * /caregiver/search:
 *   get:
 *     tags: [Caregiver]
 *     summary: Search caregivers (public)
 *     security: []
 *     parameters:
 *       - in: query
 *         name: service_area
 *         schema: { type: string }
 *       - in: query
 *         name: name
 *         schema: { type: string }
 *       - in: query
 *         name: gender
 *         schema: { type: string }
 *       - in: query
 *         name: verification_status
 *         schema: { type: string }
 *       - in: query
 *         name: min_rating
 *         schema: { type: number }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Search results
 *
 * /caregiver/bookings/my:
 *   get:
 *     tags: [Caregiver]
 *     summary: My caregiver bookings
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Bookings
 *
 * /caregiver/earnings/my:
 *   get:
 *     tags: [Caregiver]
 *     summary: My earnings
 *     responses:
 *       200:
 *         description: Earnings summary
 *
 * /caregiver/reviews/my:
 *   get:
 *     tags: [Caregiver]
 *     summary: My reviews
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Reviews
 *
 * /caregiver/{id}:
 *   get:
 *     tags: [Caregiver]
 *     summary: View caregiver public profile
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Caregiver profile
 */
