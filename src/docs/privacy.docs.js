/**
 * @openapi
 * tags:
 *   - name: Privacy Policy
 *     description: Public product privacy policy for registration (USER / CAREGIVER+NURSE)
 *
 * /privacy-policies:
 *   get:
 *     tags: [Privacy Policy]
 *     summary: List published privacy policies
 *     description: >
 *       Public. Returns published policies for all audiences.
 *       Registration UIs typically call GET /privacy-policies/{audience} instead.
 *     security: []
 *     responses:
 *       200:
 *         description: Published policies
 *
 * /privacy-policies/{audience}:
 *   get:
 *     tags: [Privacy Policy]
 *     summary: Get published privacy policy by audience
 *     description: >
 *       Public. Use `USER` on family registration, `CAREGIVER` on caregiver/nurse registration
 *       (NURSE is a caregiver subtype — same policy).
 *     security: []
 *     parameters:
 *       - in: path
 *         name: audience
 *         required: true
 *         schema:
 *           type: string
 *           enum: [USER, CAREGIVER]
 *     responses:
 *       200:
 *         description: Privacy policy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     id: { type: string, format: uuid }
 *                     audience: { type: string, enum: [USER, CAREGIVER] }
 *                     title: { type: string, example: CareMate Privacy Policy }
 *                     content: { type: string, example: We collect... }
 *                     version: { type: string, example: "1.0" }
 *                     updated_at: { type: string, format: date-time }
 *       404:
 *         description: No published policy for this audience
 *
 * /admin/privacy-policies:
 *   get:
 *     tags: [Admin]
 *     summary: List all privacy policies (admin)
 *     description: Includes unpublished drafts.
 *     responses:
 *       200:
 *         description: All privacy policies
 *   put:
 *     tags: [Admin]
 *     summary: Create or update privacy policy
 *     description: >
 *       Upserts one policy per audience. First call creates; later calls update.
 *       Set audience=USER for family app, audience=CAREGIVER for caregiver/nurse registration.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [audience, title, content]
 *             properties:
 *               audience:
 *                 type: string
 *                 enum: [USER, CAREGIVER]
 *                 example: USER
 *               title:
 *                 type: string
 *                 example: CareMate Privacy Policy — Users
 *               content:
 *                 type: string
 *                 description: Full policy body (plain text or markdown)
 *                 example: |
 *                   1. Data we collect
 *                   2. How we use it
 *                   3. Your rights
 *               version:
 *                 type: string
 *                 example: "1.0"
 *               is_published:
 *                 type: boolean
 *                 default: true
 *                 description: false hides from public GET until ready
 *     responses:
 *       200:
 *         description: Updated
 *       201:
 *         description: Created
 *       400:
 *         description: Validation error
 */
