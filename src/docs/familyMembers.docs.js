/**
 * @swagger
 * /family-members:
 *   post:
 *     tags: [Family Members]
 *     summary: "Add family member (required: photo, name, relationship, gender)"
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [name, relationship, gender, photo]
 *             properties:
 *               photo:
 *                 type: string
 *                 format: binary
 *                 description: Required
 *               name: { type: string, example: Abba, description: Required }
 *               relationship: { type: string, example: Father, description: Required }
 *               gender: { type: string, example: male, description: Required }
 *               phone: { type: string, description: Optional }
 *               blood_group: { type: string, example: B+, description: Optional }
 *               date_of_birth: { type: string, format: date, description: Optional }
 *               district: { type: string, example: Dhaka, description: Optional }
 *               thana: { type: string, example: Dhanmondi, description: Optional }
 *               house: { type: string, example: "House 12, Road 5", description: Optional }
 *               emergency_contact_name: { type: string, description: Optional }
 *               emergency_contact_phone: { type: string, description: Optional }
 *               medical_history: { type: string, description: Optional }
 *               existing_conditions: { type: string, description: Optional }
 *               allergies: { type: string, description: Optional }
 *               current_medications: { type: string, description: Optional }
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
 *               gender: { type: string, example: male }
 *               phone: { type: string }
 *               blood_group: { type: string }
 *               date_of_birth: { type: string, format: date }
 *               district: { type: string }
 *               thana: { type: string }
 *               house: { type: string }
 *               emergency_contact_name: { type: string }
 *               emergency_contact_phone: { type: string }
 *               medical_history: { type: string }
 *               existing_conditions: { type: string }
 *               allergies: { type: string }
 *               current_medications: { type: string }
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
