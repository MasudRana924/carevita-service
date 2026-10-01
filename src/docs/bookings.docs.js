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
 *             required: [service_type, booking_date, start_time, duration_hours]
 *             properties:
 *               service_type: { type: string, example: HOSPITAL_ASSISTANCE }
 *               book_for: { type: string, enum: [FAMILY, SELF], default: FAMILY, description: SELF books the logged-in user. FAMILY (default) requires family_member_id. }
 *               family_member_id: { type: string, format: uuid, description: Required when book_for is FAMILY. Omit when book_for is SELF. }
 *               district: { type: string, description: Optional. Used when book_for is SELF. }
 *               thana: { type: string, description: Optional. Used when book_for is SELF. }
 *               house: { type: string, description: Optional. Used when book_for is SELF. Falls back to the user address. }
 *               requested_provider_type: { type: string, enum: [CAREGIVER, NURSE], example: CAREGIVER, description: Provider subtype to auto-match (users.role stays CAREGIVER) }
 *               provider_id: { type: string, format: uuid, description: Optional preferred caregiver_profiles.id }
 *               hospital_id: { type: string, format: uuid }
 *               booking_date: { type: string, format: date, example: "2026-09-15" }
 *               start_time: { type: string, example: "10:00" }
 *               duration_hours: { type: integer, example: 4 }
 *               patient_requirements: { type: string }
 *               notes: { type: string }
 *               auto_assign: { type: boolean, example: true }
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
 * /bookings/{id}/accept-next-caregiver:
 *   post:
 *     tags: [Bookings]
 *     summary: User confirms the suggested next caregiver
 *     description: Sends the same booking to that caregiver. They have ACCEPT_OFFER_TIMEOUT_MINUTES (default 5) to accept.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Offer sent, or a replacement suggestion if that caregiver is no longer free
 *
 * /bookings/{id}/decline-next-caregiver:
 *   post:
 *     tags: [Bookings]
 *     summary: User declines the suggested next caregiver
 *     description: Cancels this booking. The user can create a new booking.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Booking cancelled
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
 * /bookings/{id}/safety-incident:
 *   post:
 *     tags: [Bookings]
 *     summary: Report a safety incident (USER)
 *     description: >
 *       Creates an open safety incident, freezes caregiver payout for the booking,
 *       and returns support contact info. CareMate is not an emergency dispatch service.
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
 *             required: [description]
 *             properties:
 *               description: { type: string, minLength: 5, example: Caregiver behaved inappropriately }
 *     responses:
 *       201:
 *         description: Incident recorded; payout frozen
 *       403:
 *         description: Not the booking owner
 *
 * /bookings/{id}/chat:
 *   get:
 *     tags: [Booking Chat]
 *     summary: Chat summary for a booking (USER or assigned CAREGIVER)
 *     description: >
 *       Chat is open only while status is SERVICE_IN_PROGRESS. When the service ends
 *       (completed or cancelled) every message is deleted and is_active becomes false.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: "{ booking_id, booking_number, is_active, my_role, unread_count, last_message, counterpart: { id, role, name, photo } }"
 *       403:
 *         description: Not a participant of this booking
 *
 * /bookings/{id}/chat/messages:
 *   get:
 *     tags: [Booking Chat]
 *     summary: List chat messages (oldest to newest); opening the latest page marks incoming messages read
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: before
 *         schema: { type: string, format: uuid }
 *         description: Load older messages than this message id
 *       - in: query
 *         name: after
 *         schema: { type: string, format: uuid }
 *         description: Load newer messages than this message id (catch-up after reconnect)
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 30, maximum: 100 }
 *     responses:
 *       200:
 *         description: data = messages[], meta.chat = summary, meta.has_more. Empty list when chat is closed.
 *   post:
 *     tags: [Booking Chat]
 *     summary: Send a message (JSON text, or multipart with `file` image/PDF and optional `message` caption)
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
 *               message: { type: string, maxLength: 4000 }
 *               client_message_id: { type: string, description: Client-generated id; resending the same id returns the original message }
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file: { type: string, format: binary }
 *               message: { type: string }
 *               client_message_id: { type: string }
 *     responses:
 *       201:
 *         description: Message created; counterpart gets socket `chat:message` and FCM push type BOOKING_CHAT_MESSAGE
 *       409:
 *         description: CHAT_CLOSED — service is not in progress
 *
 * /bookings/{id}/chat/read:
 *   put:
 *     tags: [Booking Chat]
 *     summary: Mark the other side's messages as read (emits socket `chat:read`)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: "{ marked }"
 */
