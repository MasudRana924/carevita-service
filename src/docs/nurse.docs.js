/**
 * @swagger
 * /nurse/profile:
 *   post:
 *     tags: [Nurse]
 *     summary: Create nurse profile
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               qualification: { type: string }
 *               specialization: { type: string }
 *               license_number: { type: string }
 *               experience_years: { type: integer }
 *               service_areas: { type: string }
 *               hourly_rate: { type: number }
 *     responses:
 *       201:
 *         description: Profile created
 *   get:
 *     tags: [Nurse]
 *     summary: Get my nurse profile
 *     responses:
 *       200:
 *         description: Profile
 *   put:
 *     tags: [Nurse]
 *     summary: Update nurse profile
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               qualification: { type: string }
 *               specialization: { type: string }
 *               license_number: { type: string }
 *               experience_years: { type: integer }
 *               service_areas: { type: string }
 *               hourly_rate: { type: number }
 *               is_available: { type: boolean }
 *     responses:
 *       200:
 *         description: Updated
 *
 * /nurse/documents:
 *   post:
 *     tags: [Nurse]
 *     summary: Submit verification document
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [document_type]
 *             properties:
 *               document_type: { type: string }
 *     responses:
 *       200:
 *         description: Document submitted
 *
 * /nurse/availability:
 *   get:
 *     tags: [Nurse]
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
 *         description: Availability
 *   post:
 *     tags: [Nurse]
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
 *         description: Set
 *
 * /nurse/search:
 *   get:
 *     tags: [Nurse]
 *     summary: Search nurses
 *     parameters:
 *       - in: query
 *         name: service_area
 *         schema: { type: string }
 *       - in: query
 *         name: specialization
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
 * /nurse/bookings/my:
 *   get:
 *     tags: [Nurse]
 *     summary: My nurse bookings
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Bookings
 *
 * /nurse/earnings/my:
 *   get:
 *     tags: [Nurse]
 *     summary: My earnings
 *     responses:
 *       200:
 *         description: Earnings
 *
 * /nurse/reviews/my:
 *   get:
 *     tags: [Nurse]
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
 * /nurse/{id}:
 *   get:
 *     tags: [Nurse]
 *     summary: View nurse profile
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Nurse profile
 */
