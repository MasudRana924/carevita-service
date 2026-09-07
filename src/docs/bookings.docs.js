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
 * /bookings/{id}/start:
 *   post:
 *     tags: [Bookings]
 *     summary: Start service
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
 *               latitude: { type: number }
 *               longitude: { type: number }
 *     responses:
 *       200:
 *         description: Service started
 *
 * /bookings/{id}/pickup:
 *   post:
 *     tags: [Bookings]
 *     summary: Mark patient picked up
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
 *               latitude: { type: number }
 *               longitude: { type: number }
 *               note: { type: string }
 *     responses:
 *       200:
 *         description: Pickup recorded
 *
 * /bookings/{id}/complete:
 *   post:
 *     tags: [Bookings]
 *     summary: Complete service
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
 *               completion_note: { type: string }
 *     responses:
 *       200:
 *         description: Completed
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
 *
 * /bookings/{id}/review:
 *   post:
 *     tags: [Bookings]
 *     summary: Submit review for booking
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
 *               rating: { type: integer, minimum: 1, maximum: 5 }
 *               comment: { type: string }
 *     responses:
 *       200:
 *         description: Review submitted
 */
