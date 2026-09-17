/**
 * @swagger
 * /health:
 *   get:
 *     tags: [Health]
 *     summary: API health check
 *     security: []
 *     responses:
 *       200:
 *         description: API is running
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *             example:
 *               success: true
 *               statusCode: 200
 *               message: CareMate API is running
 *               data:
 *                 status: ok
 *               meta:
 *                 requestId: 6f1d2c3a-1234-4abc-9def-1234567890ab
 *                 timestamp: 2026-09-18T00:00:00.000Z
 *                 path: /api/v1/health
 */
