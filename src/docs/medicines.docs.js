/**
 * @swagger
 * /medicines/search:
 *   get:
 *     tags: [Medicines]
 *     summary: Search medicines
 *     security: []
 *     parameters:
 *       - in: query
 *         name: query
 *         schema: { type: string }
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Medicines list
 *
 * /medicines/orders:
 *   post:
 *     tags: [Medicines]
 *     summary: Place medicine order
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [items]
 *             properties:
 *               family_member_id: { type: string, format: uuid }
 *               prescription_url: { type: string }
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     medicine_id: { type: string }
 *                     name: { type: string }
 *                     price: { type: number }
 *                     quantity: { type: integer }
 *               delivery_address: { type: string }
 *               delivery_lat: { type: number }
 *               delivery_long: { type: number }
 *               scheduled_delivery: { type: string, format: date-time }
 *               payment_method: { type: string }
 *     responses:
 *       201:
 *         description: Order created
 *   get:
 *     tags: [Medicines]
 *     summary: My medicine orders
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Orders
 *
 * /medicines/orders/{id}:
 *   get:
 *     tags: [Medicines]
 *     summary: Get my order
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Order
 *   delete:
 *     tags: [Medicines]
 *     summary: Cancel my order
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Cancelled
 */
