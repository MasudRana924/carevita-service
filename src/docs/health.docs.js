/**
 * @swagger
 * /health:
 *   get:
 *     tags: [Health]
 *     summary: API health check (compat)
 *     security: []
 *     responses:
 *       200:
 *         description: API is running
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *
 * /health/live:
 *   get:
 *     tags: [Health]
 *     summary: Liveness probe (process up)
 *     security: []
 *     responses:
 *       200:
 *         description: Process is alive
 *         content:
 *           application/json:
 *             example:
 *               status: live
 *               timestamp: 2026-09-22T00:00:00.000Z
 *
 * /health/ready:
 *   get:
 *     tags: [Health]
 *     summary: Readiness probe (database reachable)
 *     security: []
 *     responses:
 *       200:
 *         description: Ready to accept traffic
 *         content:
 *           application/json:
 *             example:
 *               status: ready
 *               database: ok
 *               timestamp: 2026-09-22T00:00:00.000Z
 *       503:
 *         description: Database not ready
 */
