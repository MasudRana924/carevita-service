/**
 * @swagger
 * /bookings:
 *   post:
 *     tags: [Bookings]
 *     summary: Create a booking
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [service_type, family_member_id, booking_date, start_time, duration_hours]
 *             properties:
 *               service_type: { type: string, example: HOSPITAL_ASSISTANCE }
 *               family_member_id: { type: string, format: uuid }
 *               provider_type: { type: string, example: CAREGIVER }
 *               provider_id: { type: string, format: uuid }
 *               hospital_id: { type: string, format: uuid }
 *               booking_date: { type: string, format: date, example: "2026-09-15" }
 *               start_time: { type: string, example: "10:00" }
 *               duration_hours: { type: integer, example: 4 }
 *               patient_requirements: { type: string }
 *               notes: { type: string }
 *               pickup_location:
 *                 type: object
 *                 properties:
 *                   address: { type: string }
 *                   city: { type: string }
 *                   district: { type: string }
 *                   division: { type: string }
 *                   latitude: { type: number }
 *                   longitude: { type: number }
 *     responses:
 *       201:
 *         description: Booking created
 *   get:
 *     tags: [Bookings]
 *     summary: List my bookings
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
 *         description: Bookings list
 *
 * /bookings/{id}:
 *   get:
 *     tags: [Bookings]
 *     summary: Get booking by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Booking details
 *   put:
 *     tags: [Bookings]
 *     summary: Update booking
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
 *               notes: { type: string }
 *     responses:
 *       200:
 *         description: Booking updated
 *
 * /bookings/{id}/accept:
 *   post:
 *     tags: [Bookings]
 *     summary: Accept booking (provider)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Accepted
 *
 * /bookings/{id}/reject:
 *   post:
 *     tags: [Bookings]
 *     summary: Reject booking (provider)
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
 *         description: Rejected
 *
 * /bookings/{id}/live-location:
 *   get:
 *     tags: [Bookings]
 *     summary: Get caregiver last live GPS for a booking (USER/CAREGIVER)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Latest location; is_active false after service ends
 *
 * /bookings/{id}/start:
 *   post:
 *     tags: [Bookings]
 *     summary: Deprecated path note — use POST /caregiver/bookings/{id}/start with lat/lng
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Status SERVICE_IN_PROGRESS; user gets SERVICE_STARTED push
 *
 * /bookings/{id}/complete:
 *   post:
 *     tags: [Bookings]
 *     summary: End service (caregiver, after SERVICE_IN_PROGRESS)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Status SERVICE_COMPLETED; user push opens booking details then review modal if unpaid review; earning settled to wallet
 *
 * /bookings/{id}/review:
 *   post:
 *     tags: [Bookings]
 *     summary: Submit star rating only (user, after SERVICE_COMPLETED)
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
 *             required: [rating]
 *             properties:
 *               rating: { type: integer, minimum: 1, maximum: 5, example: 5 }
 *     responses:
 *       201:
 *         description: Star review saved; caregiver average rating updated
 *
 * /bookings/{id}/cancel:
 *   post:
 *     tags: [Bookings]
 *     summary: Cancel booking
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
 *         description: Cancelled
 */
