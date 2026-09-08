/**
 * @swagger
 * /reviews:
 *   post:
 *     tags: [Reviews]
 *     summary: Submit rating + feedback for a completed caregiver/nurse booking
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [booking_id, rating]
 *             properties:
 *               booking_id: { type: string, format: uuid }
 *               rating: { type: integer, minimum: 1, maximum: 5, description: Overall rating 1-5 }
 *               feedback: { type: string, description: Text feedback (alias comment/review) }
 *               comment: { type: string }
 *               punctuality_rating: { type: integer, minimum: 1, maximum: 5 }
 *               politeness_rating: { type: integer, minimum: 1, maximum: 5 }
 *               professionalism_rating: { type: integer, minimum: 1, maximum: 5 }
 *               helpfulness_rating: { type: integer, minimum: 1, maximum: 5 }
 *               trustworthiness_rating: { type: integer, minimum: 1, maximum: 5 }
 *     responses:
 *       201:
 *         description: Review created; provider rating updated
 *       409:
 *         description: Already reviewed
 *   get:
 *     tags: [Reviews]
 *     summary: Get my reviews
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: User reviews
 *
 * /reviews/provider:
 *   get:
 *     tags: [Reviews]
 *     summary: Get reviews for a provider (caregiver profile id)
 *     parameters:
 *       - in: query
 *         name: provider_id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: provider_type
 *         required: true
 *         schema: { type: string, enum: [CAREGIVER, NURSE] }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Provider reviews + average
 *
 * /reviews/{id}:
 *   put:
 *     tags: [Reviews]
 *     summary: Update my review
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
 *               rating: { type: integer, minimum: 1, maximum: 5 }
 *               feedback: { type: string }
 *               comment: { type: string }
 *     responses:
 *       200:
 *         description: Updated
 *
 * /bookings/{id}/review:
 *   post:
 *     tags: [Bookings]
 *     summary: Submit review for a completed booking (rating + feedback)
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
 *               feedback: { type: string }
 *               comment: { type: string }
 *     responses:
 *       201:
 *         description: Review submitted
 *
 * /bookings/{id}/accept:
 *   post:
 *     tags: [Bookings]
 *     summary: Provider accepts booking (user gets notification)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Accepted + user notified
 *
 * /bookings/{id}/reject:
 *   post:
 *     tags: [Bookings]
 *     summary: Provider rejects booking (user gets notification)
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
 *         description: Rejected + user notified
 *
 * /caregiver/bookings/{id}/accept:
 *   post:
 *     tags: [Caregiver]
 *     summary: Caregiver accepts booking (alias)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Accepted
 *
 * /caregiver/bookings/{id}/reject:
 *   post:
 *     tags: [Caregiver]
 *     summary: Caregiver rejects booking (alias)
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
 */
