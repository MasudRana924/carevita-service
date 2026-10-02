/**
 * @swagger
 * /auth/send-otp:
 *   post:
 *     tags: [Auth]
 *     summary: Issue an OTP for an email or phone
 *     description: No email/SMS is sent. The OTP is always the static code (default 1234).
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Send `email` or `phone` (email wins if both are sent)
 *             properties:
 *               email: { type: string, format: email, example: user@example.com }
 *               phone: { type: string, example: "01712345678", description: Bangladeshi mobile; +880/880 prefixes accepted }
 *               type: { type: string, example: registration, description: Optional OTP purpose }
 *     responses:
 *       200:
 *         description: OTP issued
 *       400:
 *         description: Email or phone required / invalid phone
 *
 * /auth/verify-otp:
 *   post:
 *     tags: [Auth]
 *     summary: Verify a new account with the OTP and get tokens
 *     description: Only for accounts that are not verified yet. The OTP is the static code (default 1234).
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [otp]
 *             properties:
 *               email: { type: string, format: email }
 *               phone: { type: string, example: "01712345678" }
 *               otp: { type: string, example: "1234" }
 *     responses:
 *       200:
 *         description: OTP verified — returns token, refreshToken, user
 *       400:
 *         description: Invalid OTP (code OTP_INVALID)
 *       404:
 *         description: User not found
 *       409:
 *         description: Account already verified — log in instead
 *       429:
 *         description: Too many invalid attempts
 *
 * /auth/resend-otp:
 *   post:
 *     tags: [Auth]
 *     summary: Resend OTP (1 minute cooldown)
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email: { type: string, format: email }
 *               phone: { type: string, example: "01712345678" }
 *     responses:
 *       200:
 *         description: OTP resent
 *       429:
 *         description: Cooldown active
 *
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register new user with email or phone
 *     description: Send `email` or `phone` (or both). The account must then be verified via /auth/verify-otp using the identifier in `otp_channel`.
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, password]
 *             properties:
 *               name: { type: string, example: Rahim Ahmed }
 *               email: { type: string, format: email }
 *               phone: { type: string, example: "01712345678" }
 *               password: { type: string, format: password, minLength: 6 }
 *               role: { type: string, enum: [USER, CAREGIVER], example: USER, description: Public register allows USER or CAREGIVER only (ADMIN rejected) }
 *     responses:
 *       201:
 *         description: Registered successfully
 *       400:
 *         description: Invalid role or validation error
 *       409:
 *         description: Email or phone already exists
 *
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login with email or phone and password
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [password]
 *             properties:
 *               email: { type: string, format: email }
 *               phone: { type: string, example: "01712345678" }
 *               password: { type: string, format: password }
 *     responses:
 *       200:
 *         description: Login success — returns tokens and user
 *       401:
 *         description: Invalid credentials
 *       403:
 *         description: Not verified (code ACCOUNT_NOT_VERIFIED) or account inactive
 *
 * /auth/refresh-token:
 *   post:
 *     tags: [Auth]
 *     summary: Rotate refresh token and issue new access token
 *     description: >
 *       Refresh tokens are stored server-side. Each use issues a new refresh token
 *       and revokes the old one. Reusing a revoked token invalidates the whole session family.
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200:
 *         description: New access + refresh tokens
 *       401:
 *         description: Invalid or reused refresh token
 *
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Logout — revoke refresh token session family
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken: { type: string }
 *               refresh_token: { type: string, description: Alias for refreshToken }
 *     responses:
 *       200:
 *         description: Session revoked
 *
 * /auth/profile:
 *   get:
 *     tags: [Auth]
 *     summary: Get authenticated user profile
 *     responses:
 *       200:
 *         description: User profile
 *       401:
 *         description: Unauthorized
 *   put:
 *     tags: [Auth]
 *     summary: Update profile
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               email: { type: string, format: email }
 *               language_preference: { type: string, example: bn }
 *               emergency_contact: { type: string }
 *               address: { type: string }
 *     responses:
 *       200:
 *         description: Profile updated
 *
 * /auth/password:
 *   put:
 *     tags: [Auth]
 *     summary: Update password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword: { type: string, format: password }
 *               newPassword: { type: string, format: password }
 *     responses:
 *       200:
 *         description: Password updated
 *       401:
 *         description: Current password incorrect
 *
 * /auth/profile/photo:
 *   post:
 *     tags: [Auth]
 *     summary: Upload profile photo
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [photo]
 *             properties:
 *               photo:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Photo uploaded
 */
