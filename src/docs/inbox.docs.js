/**
 * @swagger
 * /inbox:
 *   get:
 *     tags: [Inbox]
 *     summary: List inbox (for push notification tap → details screen)
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: is_read
 *         schema: { type: boolean }
 *     responses:
 *       200:
 *         description: Inbox list (data includes booking_id)
 *
 * /inbox/unread-count:
 *   get:
 *     tags: [Inbox]
 *     summary: Unread inbox count
 *     responses:
 *       200:
 *         description: { unread: number }
 *
 * /inbox/read-all:
 *   put:
 *     tags: [Inbox]
 *     summary: Mark all as read
 *     responses:
 *       200:
 *         description: Done
 *
 * /inbox/{id}:
 *   get:
 *     tags: [Inbox]
 *     summary: Inbox item details
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Item with data.booking_id
 *
 * /inbox/{id}/read:
 *   put:
 *     tags: [Inbox]
 *     summary: Mark one as read
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Updated
 *
 * /notifications/tokens:
 *   post:
 *     tags: [Notifications]
 *     summary: Register FCM device token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [device_id, platform, token]
 *             properties:
 *               device_id: { type: string }
 *               platform: { type: string, example: android }
 *               token: { type: string }
 *     responses:
 *       200:
 *         description: Registered
 *   get:
 *     tags: [Notifications]
 *     summary: List my FCM tokens
 *     responses:
 *       200:
 *         description: Tokens
 *
 * /hospitals:
 *   get:
 *     tags: [Hospitals]
 *     summary: List hospitals
 *     security: []
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
 *         description: Hospitals
 *
 * /hospitals/{id}:
 *   get:
 *     tags: [Hospitals]
 *     summary: Hospital details
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Hospital
 */
