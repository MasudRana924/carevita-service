const { createUser, findByEmail, findByPhone, findById, updateUser, updatePassword, verifyPassword, setVerified } = require('../models/User');
const { generateToken } = require('../config/jwt');
const pool = require('../config/database');
const { authUser, publicUser } = require('../utils/serializers');
const { ERROR_CODES } = require('../utils/apiResponse');
const {
  normalizeRegisterRole,
  normalizePhone,
  resolveContact,
  MAX_OTP_ATTEMPTS
} = require('../utils/authHelpers');
const {
  issueTokenPair,
  rotateRefreshToken,
  logoutWithRefreshToken
} = require('../services/refreshTokenService');
const { writeAudit } = require('../utils/audit');

/** No SMS/email delivery: every OTP (email and phone) is this fixed code. */
const STATIC_OTP = String(process.env.STATIC_OTP || '1234');
const OTP_TTL_MS = 30 * 60 * 1000; // 30 minutes
const OTP_CHANNEL_COLUMNS = { email: 'email', phone: 'phone' };

const findUserByContact = (contact) =>
  contact.channel === 'phone' ? findByPhone(contact.value) : findByEmail(contact.value);

const saveOTP = async (contact, type = 'registration') => {
  const column = OTP_CHANNEL_COLUMNS[contact.channel];
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);
  try {
    await pool.query(
      `INSERT INTO otp_verifications (${column}, otp, type, expires_at, attempt_count)
       VALUES ($1, $2, $3, $4, 0)`,
      [contact.value, STATIC_OTP, type, expiresAt]
    );
  } catch (err) {
    // Pre-migration DBs without attempt_count
    if (err.code === '42703') {
      await pool.query(
        `INSERT INTO otp_verifications (${column}, otp, type, expires_at)
         VALUES ($1, $2, $3, $4)`,
        [contact.value, STATIC_OTP, type, expiresAt]
      );
    } else {
      throw err;
    }
  }
  return { expiresAt };
};

const isOtpLocked = async (contact) => {
  const column = OTP_CHANNEL_COLUMNS[contact.channel];
  const locked = await pool.query(
    `
    SELECT 1 FROM otp_verifications
    WHERE ${column} = $1 AND type = 'registration' AND locked_at IS NOT NULL
      AND created_at > NOW() - INTERVAL '30 minutes'
    LIMIT 1
    `,
    [contact.value]
  );
  return locked.rowCount > 0;
};

const recordFailedOtpAttempt = async (contact) => {
  const column = OTP_CHANNEL_COLUMNS[contact.channel];
  const latest = await pool.query(
    `
    SELECT id, attempt_count
    FROM otp_verifications
    WHERE ${column} = $1 AND type = 'registration' AND is_used = false AND locked_at IS NULL
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [contact.value]
  );
  if (!latest.rows[0]) return { locked: false };

  const nextCount = Number(latest.rows[0].attempt_count || 0) + 1;
  if (nextCount >= MAX_OTP_ATTEMPTS) {
    await pool.query(
      `
      UPDATE otp_verifications
      SET attempt_count = $1, locked_at = CURRENT_TIMESTAMP, is_used = true
      WHERE id = $2
      `,
      [nextCount, latest.rows[0].id]
    );
    return { locked: true, attempts: nextCount };
  }

  await pool.query(
    `UPDATE otp_verifications SET attempt_count = $1 WHERE id = $2`,
    [nextCount, latest.rows[0].id]
  );
  return { locked: false, attempts: nextCount };
};

const markOtpsUsed = async (contact) => {
  const column = OTP_CHANNEL_COLUMNS[contact.channel];
  await pool.query(
    `UPDATE otp_verifications SET is_used = true
     WHERE ${column} = $1 AND type = 'registration' AND is_used = false`,
    [contact.value]
  );
};

const tooManyOtpAttempts = (res) =>
  res.error(
    'Too many invalid OTP attempts. Request a new OTP.',
    [],
    429,
    ERROR_CODES.TOO_MANY_REQUESTS
  );

exports.sendOTP = async (req, res) => {
  try {
    const contact = resolveContact(req.body);
    if (!contact.ok) {
      return res.error(contact.message);
    }

    const { expiresAt } = await saveOTP(contact, req.body.type || 'registration');

    return res.success(
      { expiresAt, otp_channel: contact.channel, [contact.channel]: contact.value },
      'OTP sent successfully'
    );
  } catch (error) {
    console.error('Send OTP error:', error);
    res.serverError('Failed to send OTP');
  }
};

exports.verifyOTP = async (req, res) => {
  try {
    const contact = resolveContact(req.body);
    if (!contact.ok) {
      return res.error(contact.message);
    }
    if (!req.body.otp) {
      return res.error('OTP is required');
    }

    const user = await findUserByContact(contact);
    if (!user) {
      return res.notFound('User not found');
    }
    // Static OTP must never act as a password for an already verified account.
    if (user.is_verified) {
      return res.conflict('Account is already verified. Please log in.');
    }

    if (await isOtpLocked(contact)) {
      return tooManyOtpAttempts(res);
    }

    if (String(req.body.otp).trim() !== STATIC_OTP) {
      const attempt = await recordFailedOtpAttempt(contact);
      if (attempt.locked) {
        await writeAudit({
          action: 'OTP_LOCKED',
          entityType: 'otp',
          meta: { [contact.channel]: contact.value, attempts: attempt.attempts }
        });
        return tooManyOtpAttempts(res);
      }
      return res.error('Invalid OTP', [], 400, ERROR_CODES.OTP_INVALID);
    }

    await markOtpsUsed(contact);

    if (user.status && user.status !== 'active') {
      return res.forbidden('Account is not active');
    }

    const verifiedUser = await setVerified(user.id);
    const tokens = await issueTokenPair(verifiedUser);

    return res.success({
      token: tokens.token,
      refreshToken: tokens.refreshToken,
      user: authUser(verifiedUser)
    }, 'OTP verified successfully');
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.serverError('Failed to verify OTP');
  }
};

exports.register = async (req, res) => {
  try {
    const { name, password, role } = req.body;
    const email = req.body.email != null ? String(req.body.email).trim() : '';
    const rawPhone = req.body.phone != null ? String(req.body.phone).trim() : '';

    if (!name || !password || (!email && !rawPhone)) {
      return res.error('Name, password, and email or phone are required');
    }

    const phone = rawPhone ? normalizePhone(rawPhone) : null;
    if (rawPhone && !phone) {
      return res.error(
        'Invalid phone number. Use a Bangladeshi mobile number like 01712345678.',
        [],
        400,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    const roleResult = normalizeRegisterRole(role);
    if (!roleResult.ok) {
      return res.error(roleResult.message, [], 400, ERROR_CODES.VALIDATION_ERROR);
    }

    if (email && await findByEmail(email)) {
      return res.conflict('User with this email already exists');
    }
    if (phone && await findByPhone(phone)) {
      return res.conflict('User with this phone number already exists');
    }

    const user = await createUser({
      name,
      email: email || null,
      phone,
      password,
      role: roleResult.role
    });

    const contact = email
      ? { channel: 'email', value: email }
      : { channel: 'phone', value: phone };
    const { expiresAt } = await saveOTP(contact, 'registration');

    const message = roleResult.role === 'CAREGIVER'
      ? 'Caregiver registration successful. Please verify your account with the OTP.'
      : 'Registration successful. Please verify your account with the OTP.';

    return res.created({
      user: authUser(user),
      expiresAt,
      otp_channel: contact.channel
    }, message);
  } catch (error) {
    if (error.code === '23505') {
      return res.conflict('User with this email or phone number already exists');
    }
    console.error('Registration error:', error);
    res.serverError('Registration failed');
  }
};

exports.login = async (req, res) => {
  try {
    const contact = resolveContact(req.body);
    const { password } = req.body;

    if (!contact.ok) {
      return res.error(contact.message);
    }
    if (!password) {
      return res.error('Password is required');
    }

    const user = await findUserByContact(contact);
    if (!user || !user.password) {
      return res.unauthorized('Invalid credentials');
    }

    const isPasswordValid = await verifyPassword(password, user.password);
    if (!isPasswordValid) {
      return res.unauthorized('Invalid credentials');
    }

    if (!user.is_verified) {
      return res.forbidden('Please verify your account first', ERROR_CODES.ACCOUNT_NOT_VERIFIED);
    }

    if (user.status !== 'active') {
      return res.forbidden('Account is not active');
    }

    const tokens = await issueTokenPair(user);

    return res.success({
      token: tokens.token,
      refreshToken: tokens.refreshToken,
      user: authUser(user)
    }, 'Login successful');
  } catch (error) {
    console.error('Login error:', error);
    res.serverError('Login failed');
  }
};


exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.badRequest('Refresh token is required');
    }

    const rotated = await rotateRefreshToken(refreshToken);

    if (rotated.reuseDetected) {
      await writeAudit({
        action: 'REFRESH_TOKEN_REUSE',
        entityType: 'session',
        meta: { familyId: rotated.familyId || null }
      });
      return res.unauthorized(
        'Refresh token reuse detected. Please sign in again.',
        ERROR_CODES.TOKEN_INVALID
      );
    }

    if (rotated.invalid || !rotated.userId) {
      return res.unauthorized('Invalid refresh token', ERROR_CODES.TOKEN_INVALID);
    }

    const user = await findById(rotated.userId);
    if (!user || user.status !== 'active') {
      return res.unauthorized('Invalid refresh token', ERROR_CODES.TOKEN_INVALID);
    }

    const token = generateToken({ userId: user.id, role: user.role });

    return res.success({
      token,
      refreshToken: rotated.refreshToken
    }, 'Token refreshed successfully');
  } catch (error) {
    console.error('Refresh token error:', error);
    return res.unauthorized('Invalid refresh token', ERROR_CODES.TOKEN_INVALID);
  }
};

exports.logout = async (req, res) => {
  try {
    const refreshToken = req.body?.refreshToken || req.body?.refresh_token || null;
    const result = await logoutWithRefreshToken(refreshToken);

    if (result.userId || req.user?.id) {
      await writeAudit({
        actorId: result.userId || req.user?.id || null,
        action: 'LOGOUT',
        entityType: 'session',
        entityId: result.userId || req.user?.id || null,
        meta: { familyId: result.familyId || null, revoked: !!result.revoked }
      });
    }

    return res.success({ revoked: !!result.revoked }, 'Logged out successfully');
  } catch (error) {
    console.error('Logout error:', error);
    return res.serverError('Failed to logout');
  }
};

exports.getProfile = async (req, res) => {
  try {
    const user = await findById(req.user.id);

    if (!user) {
      return res.notFound('User not found');
    }

    return res.success(publicUser(user), 'Profile fetched successfully');
  } catch (error) {
    console.error('Get profile error:', error);
    return res.serverError('Failed to fetch profile');
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { name, email, language_preference, emergency_contact, address } = req.body;

    if (email && email !== req.user.email) {
      const existingEmail = await findByEmail(email);
      if (existingEmail) {
        return res.conflict('Email already in use');
      }
    }

    const user = await updateUser(req.user.id, {
      name,
      email,
      language_preference,
      emergency_contact,
      address
    });

    return res.success(publicUser(user), 'Profile updated successfully');
  } catch (error) {
    console.error('Update profile error:', error);
    return res.serverError('Failed to update profile');
  }
};

exports.updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.badRequest('Current and new password are required');
    }

    const user = await findById(req.user.id);
    if (!user) {
      return res.notFound('User not found');
    }

    if (user.password) {
      const isPasswordValid = await verifyPassword(currentPassword, user.password);
      if (!isPasswordValid) {
        return res.unauthorized('Current password is incorrect');
      }
    }

    await updatePassword(req.user.id, newPassword);

    return res.success(null, 'Password updated successfully');
  } catch (error) {
    console.error('Update password error:', error);
    return res.serverError('Failed to update password');
  }
};

exports.uploadProfilePhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.badRequest('No file uploaded');
    }

    const user = await updateUser(req.user.id, {
      profile_photo: req.file.path
    });

    return res.success({
      profile_photo: user.profile_photo
    }, 'Profile photo uploaded successfully');
  } catch (error) {
    console.error('Upload photo error:', error);
    return res.serverError('Failed to upload profile photo');
  }
};

exports.resendOTP = async (req, res) => {
  try {
    const contact = resolveContact(req.body);
    if (!contact.ok) {
      return res.error(contact.message);
    }

    const column = OTP_CHANNEL_COLUMNS[contact.channel];
    const lastOTP = await pool.query(
      `SELECT created_at FROM otp_verifications
       WHERE ${column} = $1 AND type = 'registration'
       AND is_used = false AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [contact.value]
    );

    if (lastOTP.rows.length > 0) {
      const lastSentTime = new Date(lastOTP.rows[0].created_at);
      const cooldownTime = 60 * 1000; // 1 minute cooldown
      const timeSinceLastSent = Date.now() - lastSentTime.getTime();

      if (timeSinceLastSent < cooldownTime) {
        const remainingCooldown = Math.ceil((cooldownTime - timeSinceLastSent) / 1000);
        return res.tooManyRequests(`Please wait ${remainingCooldown} seconds before requesting another OTP`);
      }
    }

    const { expiresAt } = await saveOTP(contact, 'registration');

    return res.success(
      { expiresAt, otp_channel: contact.channel, [contact.channel]: contact.value },
      'OTP resent successfully'
    );
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.serverError('Failed to resend OTP');
  }
};