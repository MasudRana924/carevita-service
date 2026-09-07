/**
 * @swagger
 * /family-members:
 *   post:
 *     tags: [Family Members]
 *     summary: Add family member
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [name, relationship]
 *             properties:
 *               name: { type: string, example: Abba }
 *               relationship: { type: string, example: Father }
 *               phone: { type: string }
 *               blood_group: { type: string, example: B+ }
 *               date_of_birth: { type: string, format: date }
 *               photo:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Family member created
 *   get:
 *     tags: [Family Members]
 *     summary: List family members
 *     responses:
 *       200:
 *         description: Family members list
 *
 * /family-members/{id}:
 *   get:
 *     tags: [Family Members]
 *     summary: Get family member by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Family member details
 *       404:
 *         description: Not found
 *   put:
 *     tags: [Family Members]
 *     summary: Update family member
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               relationship: { type: string }
 *               phone: { type: string }
 *               blood_group: { type: string }
 *               date_of_birth: { type: string, format: date }
 *               photo:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Updated
 *   delete:
 *     tags: [Family Members]
 *     summary: Delete family member
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Deleted
 */
