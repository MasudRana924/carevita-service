/**
 * @swagger
 * /services/services:
 *   get:
 *     tags: [Services]
 *     summary: List services
 *     responses:
 *       200:
 *         description: Services catalog
 *
 * /services/services/{id}:
 *   get:
 *     tags: [Services]
 *     summary: Get service by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Service details
 *
 * /services/hospitals:
 *   get:
 *     tags: [Services]
 *     summary: List hospitals
 *     parameters:
 *       - in: query
 *         name: district
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Hospitals list
 *
 * /services/hospitals/{id}:
 *   get:
 *     tags: [Services]
 *     summary: Get hospital by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Hospital details
 *
 * /services/hospitals/{id}/availability:
 *   get:
 *     tags: [Services]
 *     summary: Hospital availability
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Availability
 */
