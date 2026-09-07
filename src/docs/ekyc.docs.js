/**
 * @swagger
 * /ekyc/initiate:
 *   post:
 *     tags: [eKYC]
 *     summary: Start eKYC verification (Didit)
 *     description: Returns a verification_url for the user to complete identity check.
 *     responses:
 *       200:
 *         description: Verification initiated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 message: { type: string }
 *                 data:
 *                   type: object
 *                   properties:
 *                     verification_url: { type: string }
 *                     reference_id: { type: string }
 *                     session_id: { type: string }
 *       400:
 *         description: Already verified
 *
 * /ekyc/status:
 *   get:
 *     tags: [eKYC]
 *     summary: Get current eKYC status
 *     responses:
 *       200:
 *         description: eKYC status for current user
 *
 * /ekyc/webhook:
 *   post:
 *     tags: [eKYC]
 *     summary: Didit webhook (server-to-server)
 *     security: []
 *     description: Called by Didit — frontend usually does not call this.
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Webhook processed
 */
