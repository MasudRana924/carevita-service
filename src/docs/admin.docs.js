/**
 * @swagger
 * /admin/profile:
 *   get:
 *     tags: [Admin]
 *     summary: Admin profile
 *     responses:
 *       200:
 *         description: Profile
 *
 * /admin/dashboard:
 *   get:
 *     tags: [Admin]
 *     summary: Dashboard stats
 *     responses:
 *       200:
 *         description: Stats
 *
 * /admin/users:
 *   get:
 *     tags: [Admin]
 *     summary: List users
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
 *         description: Users
 *
 * /admin/users/{id}/block:
 *   put:
 *     tags: [Admin]
 *     summary: Block user
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Blocked
 *
 * /admin/users/{id}/unblock:
 *   put:
 *     tags: [Admin]
 *     summary: Unblock user
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Unblocked
 *
 * /admin/caregivers:
 *   get:
 *     tags: [Admin]
 *     summary: List caregivers
 *     parameters:
 *       - in: query
 *         name: verification_status
 *         schema: { type: string }
 *       - in: query
 *         name: ekyc_session_status
 *         schema: { type: string, example: In Review }
 *         description: Filter by Didit session status (e.g. In Review, Approved)
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Caregivers
 *
 * /admin/caregivers/{id}/ekyc:
 *   get:
 *     tags: [Admin]
 *     summary: Get caregiver Didit eKYC details
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Caregiver profile id or user id
 *     responses:
 *       200:
 *         description: eKYC status + Didit decision summary
 *
 * /admin/caregivers/{id}/ekyc/approve:
 *   post:
 *     tags: [Admin]
 *     summary: Approve caregiver Didit eKYC (In Review to Approved)
 *     description: Calls Didit update-status so admin does not need the Didit console.
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
 *               comment: { type: string, example: Face match reviewed and accepted }
 *     responses:
 *       200:
 *         description: Approved on Didit and local DB updated
 *
 * /admin/caregivers/{id}/ekyc/decline:
 *   post:
 *     tags: [Admin]
 *     summary: Decline caregiver Didit eKYC
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
 *               comment: { type: string, example: Document mismatch }
 *     responses:
 *       200:
 *         description: Declined on Didit and local DB updated
 *
 * /admin/caregivers/{id}/credentials:
 *   post:
 *     tags: [Admin]
 *     summary: Review nurse/professional credentials
 *     description: Manual verification workflow (no external BNMC auto-check).
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Caregiver profile id or user id
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [credential_status]
 *             properties:
 *               credential_status:
 *                 type: string
 *                 enum: [VERIFIED, REJECTED, PENDING, SUSPENDED, REVERIFY_REQUIRED]
 *               note: { type: string }
 *               credential_expires_at: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Credential status updated
 *
 * /admin/caregivers/{id}/block:
 *   put:
 *     tags: [Admin]
 *     summary: Block caregiver
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Blocked
 *
 * /admin/caregivers/{id}/unblock:
 *   put:
 *     tags: [Admin]
 *     summary: Unblock caregiver
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Unblocked
 *
 * /admin/safety-incidents:
 *   get:
 *     tags: [Admin]
 *     summary: List safety incidents
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [OPEN, IN_REVIEW, RESOLVED, DISMISSED] }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Safety incidents
 *
 * /admin/safety-incidents/{id}:
 *   patch:
 *     tags: [Admin]
 *     summary: Update safety incident status
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
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [OPEN, IN_REVIEW, RESOLVED, DISMISSED] }
 *               note: { type: string }
 *               unfreeze_payout: { type: boolean, example: true, description: Clear booking.payout_frozen when resolving }
 *     responses:
 *       200:
 *         description: Incident updated
 *
 * /admin/hospitals:
 *   get:
 *     tags: [Admin]
 *     summary: List hospitals
 *     responses:
 *       200:
 *         description: Hospitals
 *   post:
 *     tags: [Admin]
 *     summary: Create hospital
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *               district: { type: string }
 *               city: { type: string }
 *               address: { type: string }
 *               phone: { type: string }
 *               photo: { type: string, format: binary }
 *     responses:
 *       201:
 *         description: Created
 *
 * /admin/hospitals/{id}:
 *   put:
 *     tags: [Admin]
 *     summary: Update hospital
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Updated
 */
