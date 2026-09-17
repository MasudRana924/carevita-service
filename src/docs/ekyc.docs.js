/**
 * @swagger
 * /caregiver/ekyc/initiate:
 *   post:
 *     tags: [Caregiver]
 *     summary: Start Didit eKYC and get hosted verification URL
 *     description: >
 *       Call after caregiver register + OTP verify (Bearer token required).
 *       Opens a Didit session and returns `verification_url` (web/webview) plus `session_token` (native SDK).
 *       Unfinished sessions are reused. Already-approved caregivers get 200 with `ekyc_status: true` unless `reverify: true`.
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               redirect_url:
 *                 type: string
 *                 example: caremate-caregiver://ekyc/callback
 *                 description: App callback after Didit finishes. Custom URL schemes are supported.
 *               reverify:
 *                 type: boolean
 *                 example: false
 *     responses:
 *       201:
 *         description: New Didit session created
 *       200:
 *         description: Existing open session resumed, or already verified
 *
 * /caregiver/ekyc/status:
 *   get:
 *     tags: [Caregiver]
 *     summary: Get caregiver eKYC status
 *     responses:
 *       200:
 *         description: Current eKYC flags and active session
 *
 * /ekyc/initiate:
 *   post:
 *     tags: [eKYC]
 *     summary: Start Didit eKYC (caregiver alias of /caregiver/ekyc/initiate)
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               redirect_url: { type: string }
 *               reverify: { type: boolean }
 *     responses:
 *       201:
 *         description: Session created
 *
 * /ekyc/status:
 *   get:
 *     tags: [eKYC]
 *     summary: Get eKYC status (caregiver alias of /caregiver/ekyc/status)
 *     responses:
 *       200:
 *         description: Current eKYC status
 *
 * /ekyc/webhook:
 *   post:
 *     tags: [eKYC]
 *     summary: Didit webhook receiver
 *     security: []
 *     description: Public endpoint for Didit. Verifies HMAC signatures then updates caregiver eKYC.
 *     responses:
 *       200:
 *         description: Webhook processed
 *       401:
 *         description: Invalid signature
 */
