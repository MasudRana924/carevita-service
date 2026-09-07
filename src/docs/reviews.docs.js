/**
 * @swagger
 * /reviews/provider:
 *   get:
 *     tags: [Reviews]
 *     summary: Get reviews for a provider
 *     parameters:
 *       - in: query
 *         name: provider_id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: provider_type
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Provider reviews
 *
 * /reviews:
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
 * /reviews/{id}:
 *   put:
 *     tags: [Reviews]
 *     summary: Update a review
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
 *               comment: { type: string }
 *     responses:
 *       200:
 *         description: Updated
 */
