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
 *               district: { type: string, example: Dhaka, description: Required }
 *               thana: { type: string, example: Dhanmondi, description: Required }
 *               provider_type: { type: string, enum: [CAREGIVER, NURSE], example: CAREGIVER }
 *               credential_number: { type: string, description: Required when provider_type=NURSE }
 *               credential_type: { type: string, example: BNMC_LICENSE }
 *               specialization: { type: string }
 *               profile_photo:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Profile created
 *       400:
 *         description: Missing district/thana or nurse credential_number
 *   get:
 *     tags: [Caregiver]
 *     summary: Get my caregiver profile
 *     responses:
 *       200:
 *         description: Profile
 *   put:
 *     tags: [Caregiver]
 *     summary: Update caregiver profile (JSON or multipart)
 *     description: >
 *       Prefer application/json from React Native for field-only updates.
 *       Use multipart/form-data only when uploading profile_photo.
 *       Do not manually set Content-Type for FormData (boundary required).
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               bio: { type: string }
 *               experience_years: { type: integer }
 *               service_areas: { type: string, example: "Dhaka,Mirpur" }
 *               hourly_rate: { type: number }
 *               is_available: { type: boolean }
 *               education: { type: string }
 *               blood_group: { type: string }
 *               date_of_birth: { type: string, format: date }
 *               gender: { type: string }
 *               district: { type: string, example: Dhaka }
 *               thana: { type: string, example: Dhanmondi }
 *               credential_number: { type: string }
 *               credential_type: { type: string }
 *               specialization: { type: string }
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
 *               district: { type: string, example: Dhaka }
 *               thana: { type: string, example: Dhanmondi }
 *               credential_number: { type: string }
 *               credential_type: { type: string }
 *               specialization: { type: string }
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
 *     summary: Search caregivers (public) — filter by district, thana
 *     security: []
 *     parameters:
 *       - in: query
 *         name: district
 *         schema: { type: string }
 *         example: Dhaka
 *       - in: query
 *         name: thana
 *         schema: { type: string }
 *         example: Dhanmondi
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
 *     summary: My star reviews
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Average rating + star reviews (no comments)
 *
 * /caregiver/bookings/{id}/start:
 *   post:
 *     tags: [Caregiver]
 *     summary: Start assigned booking with GPS (enables live tracking)
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
 *             required: [latitude, longitude]
 *             properties:
 *               latitude: { type: number, example: 23.8103 }
 *               longitude: { type: number, example: 90.4125 }
 *               accuracy: { type: number }
 *               heading: { type: number }
 *               speed: { type: number }
 *     responses:
 *       200:
 *         description: Service started; live tracking active
 *
 * /caregiver/bookings/{id}/location:
 *   post:
 *     tags: [Caregiver]
 *     summary: Push caregiver live GPS while SERVICE_IN_PROGRESS (REST fallback)
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
 *             required: [latitude, longitude, consent]
 *             properties:
 *               consent: { type: boolean, example: true, description: Required true on first publish (or consent_granted) }
 *               consent_granted: { type: boolean, example: true }
 *               latitude: { type: number }
 *               longitude: { type: number }
 *               accuracy: { type: number }
 *               heading: { type: number }
 *               speed: { type: number }
 *     responses:
 *       200:
 *         description: Location updated and broadcast over Socket.IO
 *       400:
 *         description: Missing consent or invalid coordinates
 *
 * /caregiver/bookings/{id}/complete:
 *   post:
 *     tags: [Caregiver]
 *     summary: End assigned booking (stops live tracking)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Service completed; earning settled to wallet; tracking ended
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
