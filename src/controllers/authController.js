const crypto = require('crypto');
const { createUser, findByEmail, findById, updateUser, updatePassword, verifyPassword, setVerified } = require('../models/User');
const { generateToken } = require('../config/jwt');
const pool = require('../config/database');
const transporter = require('../config/nodemailer');
const { authUser, publicUser } = require('../utils/serializers');
const { ERROR_CODES } = require('../utils/apiResponse');
const { normalizeRegisterRole, MAX_OTP_ATTEMPTS } = require('../utils/authHelpers');
const {
  issueTokenPair,
  rotateRefreshToken,
  logoutWithRefreshToken
} = require('../services/refreshTokenService');
const { writeAudit } = require('../utils/audit');

const DEV_OTP = process.env.DEV_OTP || '5852';
const OTP_TTL_MS = 30 * 60 * 1000; // 30 minutes

/** Static/dev OTP only when explicitly allowed and never in production. */
const allowStaticOtp = () =>
  process.env.ALLOW_STATIC_OTP === 'true' &&
  process.env.NODE_ENV !== 'production';

const sendEmailOTP = async (email, otp) => {
  try {
    const mailOptions = {
      from: process.env.SMTP_USER,
      to: email,
      subject: 'CareMate - Email Verification OTP',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">Email Verification</h2>
          <p>Your verification code is:</p>
          <div style="background-color: #f0f0f0; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
            ${otp}
          </div>
          <p>This code will expire in 30 minutes.</p>
          <p style="color: #666; font-size: 12px;">If you didn't request this code, please ignore this email.</p>
        </div>
      `
    };
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Email sending error:', error);
    return false;
  }
};

const generateOTP = () => {
  if (allowStaticOtp()) return String(DEV_OTP);
  return String(crypto.randomInt(100000, 1000000));
};

const otpFailureMessage = () =>
  allowStaticOtp()
    ? `OTP saved. Email delivery failed — use OTP ${DEV_OTP} to verify.`
    : 'OTP saved. Email delivery failed — please try again or contact support.';

const saveRegistrationOTP = async (email, type = 'registration') => {
  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);
  try {
    await pool.query(
      `INSERT INTO otp_verifications (email, otp, type, expires_at, attempt_count)
       VALUES ($1, $2, $3, $4, 0)`,
      [email, otp, type, expiresAt]
    );
  } catch (err) {
    // Pre-migration DBs without attempt_count
    if (err.code === '42703') {
      await pool.query(
        `INSERT INTO otp_verifications (email, otp, type, expires_at)
         VALUES ($1, $2, $3, $4)`,
        [email, otp, type, expiresAt]
      );
    } else {
      throw err;
    }
  }
  return { otp, expiresAt };
};

const recordFailedOtpAttempt = async (email) => {
  const latest = await pool.query(
    `
    SELECT id, attempt_count
    FROM otp_verifications
    WHERE email = $1 AND type = 'registration' AND is_used = false AND expires_at > NOW()
      AND locked_at IS NULL
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [email]
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

const findActiveOtpRow = async (email, submittedOtp, { allowExpiredStatic = false } = {}) => {
  if (allowExpiredStatic) {
    return pool.query(
      `
      SELECT * FROM otp_verifications
      WHERE email = $1 AND type = 'registration' AND is_used = false
        AND otp = $2 AND locked_at IS NULL
      ORDER BY created_at DESC LIMIT 1
      `,
      [email, submittedOtp]
    );
  }

  return pool.query(
    `
    SELECT * FROM otp_verifications
    WHERE email = $1 AND otp = $2 AND type = 'registration'
      AND is_used = false AND expires_at > NOW() AND locked_at IS NULL
    ORDER BY created_at DESC LIMIT 1
    `,
    [email, submittedOtp]
  );
};

exports.sendOTP = async (req, res) => {
  try {
    const { email, type } = req.body;

    if (!email) {
      return res.error('Email is required');
    }

    const { otp, expiresAt } = await saveRegistrationOTP(email, type || 'registration');
    const emailSent = await sendEmailOTP(email, otp);

    return res.success(
      { expiresAt, email_sent: emailSent },
      emailSent ? 'OTP sent successfully' : otpFailureMessage()
    );
  } catch (error) {
    console.error('Send OTP error:', error);
    res.serverError('Failed to send OTP');
  }
};

exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.error('Email and OTP are required');
    }

    const submittedOtp = String(otp).trim();
    const isStaticOtp = allowStaticOtp() && submittedOtp === String(DEV_OTP);

    const locked = await pool.query(
      `
      SELECT 1 FROM otp_verifications
      WHERE email = $1 AND type = 'registration' AND locked_at IS NOT NULL
        AND created_at > NOW() - INTERVAL '30 minutes'
      LIMIT 1
      `,
      [email]
    );
    if (locked.rowCount > 0) {
      return res.error(
        'Too many invalid OTP attempts. Request a new OTP.',
        [],
        429,
        ERROR_CODES.TOO_MANY_REQUESTS
      );
    }

    const result = await findActiveOtpRow(email, isStaticOtp ? String(DEV_OTP) : submittedOtp, {
      allowExpiredStatic: isStaticOtp
    });

    if (result.rows.length === 0) {
      const attempt = await recordFailedOtpAttempt(email);
      if (attempt.locked) {
        await writeAudit({
          action: 'OTP_LOCKED',
          entityType: 'otp',
          meta: { email, attempts: attempt.attempts }
        });
        return res.error(
          'Too many invalid OTP attempts. Request a new OTP.',
          [],
          429,
          ERROR_CODES.TOO_MANY_REQUESTS
        );
      }
      return res.error('Invalid or expired OTP', [], 400, ERROR_CODES.OTP_INVALID);
    }

    await pool.query(
      `UPDATE otp_verifications SET is_used = true WHERE id = $1`,
      [result.rows[0].id]
    );

    const user = await findByEmail(email);

    if (!user) {
      return res.notFound('User not found');
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
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.error('Name, email, and password are required');
    }

    const roleResult = normalizeRegisterRole(role);
    if (!roleResult.ok) {
      return res.error(roleResult.message, [], 400, ERROR_CODES.VALIDATION_ERROR || 'VALIDATION_ERROR');
    }

    const existingUser = await findByEmail(email);
    if (existingUser) {
      return res.conflict('User with this email already exists');
    }

    const user = await createUser({
      name,
      email,
      password,
      role: roleResult.role
    });

    const { otp, expiresAt } = await saveRegistrationOTP(email, 'registration');
    const emailSent = await sendEmailOTP(email, otp);

    const userPayload = authUser(user);
    const message = emailSent
      ? (roleResult.role === 'CAREGIVER'
        ? 'Caregiver registration successful. Please verify your email with the OTP sent to your email address.'
        : 'Registration successful. Please verify your email with the OTP sent to your email address.')
      : (allowStaticOtp()
        ? `Registration successful. Email delivery failed — use OTP ${DEV_OTP} to verify.`
        : 'Registration successful. Email delivery failed — please try again or contact support.');

    return res.created({
      user: userPayload,
      expiresAt,
      email_sent: emailSent
    }, message);
  } catch (error) {
    console.error('Registration error:', error);
    res.serverError('Registration failed');
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.error('Email and password are required');
    }

    const user = await findByEmail(email);
    if (!user) {
      return res.unauthorized('Invalid credentials');
    }

    if (!user.is_verified) {
      return res.forbidden('Please verify your email first');
    }

    if (!user.password) {
      return res.error('Please use OTP login');
    }

    const isPasswordValid = await verifyPassword(password, user.password);
    if (!isPasswordValid) {
      return res.unauthorized('Invalid credentials');
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
    const { email } = req.body;

    if (!email) {
      return res.error('Email is required');
    }

    const lastOTP = await pool.query(
      `SELECT * FROM otp_verifications 
       WHERE email = $1 AND type = 'registration'
       AND is_used = false AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [email]
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

    const { otp, expiresAt } = await saveRegistrationOTP(email, 'registration');
    const emailSent = await sendEmailOTP(email, otp);

    return res.success(
      { expiresAt, email_sent: emailSent },
      emailSent ? 'OTP resent successfully' : otpFailureMessage()
    );
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.serverError('Failed to resend OTP');
  }
};
