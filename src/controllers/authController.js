const { createUser, findByPhone, findByEmail, findById, updateUser, updatePassword, verifyPassword, setVerified } = require('../models/User');
const { generateToken, generateRefreshToken } = require('../config/jwt');
const pool = require('../config/database');
const transporter = require('../config/nodemailer');

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
          <p>This code will expire in 1 minute.</p>
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
  return '5852';
};

exports.sendOTP = async (req, res) => {
  try {
    const { email, type } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 1 * 60 * 1000);

    await pool.query(
      `INSERT INTO otp_verifications (email, otp, type, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [email, otp, type || 'registration', expiresAt]
    );

    const emailSent = await sendEmailOTP(email, otp);
    if (!emailSent) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send OTP email'
      });
    }

    res.status(200).json({
      success: true,
      message: 'OTP sent successfully to your email',
      expiresAt
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send OTP'
    });
  }
};

exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp, type } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP are required'
      });
    }

    const result = await pool.query(
      `SELECT * FROM otp_verifications 
       WHERE email = $1 AND otp = $2 AND type = $3 
       AND is_used = false AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [email, otp, type || 'registration']
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }

    await pool.query(
      `UPDATE otp_verifications SET is_used = true WHERE id = $1`,
      [result.rows[0].id]
    );

    const user = await findByEmail(email);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const token = generateToken({ userId: user.id, role: user.role });
    const refreshToken = generateRefreshToken({ userId: user.id });

    await setVerified(user.id);

    res.status(200).json({
      success: true,
      message: 'OTP verified successfully',
      token,
      refreshToken,
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        email: user.email,
        role: user.role,
        is_verified: user.is_verified
      }
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify OTP'
    });
  }
};

exports.register = async (req, res) => {
  try {
    const { name, email, password, language_preference, emergency_contact, address } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email and password are required'
      });
    }

    const existingEmail = await findByEmail(email);
    if (existingEmail) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    const user = await createUser({
      phone: null,
      email,
      password,
      name,
      language_preference,
      emergency_contact,
      address
    });

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 1 * 60 * 1000);

    await pool.query(
      `INSERT INTO otp_verifications (email, otp, type, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [email, otp, 'registration', expiresAt]
    );

    const emailSent = await sendEmailOTP(email, otp);
    if (!emailSent) {
      return res.status(500).json({
        success: false,
        message: 'Registration successful but failed to send OTP email'
      });
    }

    res.status(201).json({
      success: true,
      message: 'Registration successful. Please verify your email with the OTP sent to your email address. OTP expires in 1 minute.',
      expiresAt
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed'
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    const user = await findByEmail(email);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.password) {
      return res.status(400).json({
        success: false,
        message: 'Please use OTP login'
      });
    }

    const isPasswordValid = await verifyPassword(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    if (!user.is_verified) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email first'
      });
    }

    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Account is not active'
      });
    }

    const token = generateToken({ userId: user.id, role: user.role });
    const refreshToken = generateRefreshToken({ userId: user.id });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      refreshToken,
      user: {
        id: user.id,
        phone: user.phone,
        email: user.email,
        name: user.name,
        role: user.role,
        is_verified: user.is_verified
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed'
    });
  }
};

exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required'
      });
    }

    const { verifyRefreshToken } = require('../config/jwt');
    const decoded = verifyRefreshToken(refreshToken);

    const user = await findById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }

    const token = generateToken({ userId: user.id, role: user.role });
    const newRefreshToken = generateRefreshToken({ userId: user.id });

    res.status(200).json({
      success: true,
      token,
      refreshToken: newRefreshToken
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid refresh token'
    });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const user = await findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user.id,
        phone: user.phone,
        email: user.email,
        name: user.name,
        profile_photo: user.profile_photo,
        role: user.role,
        status: user.status,
        is_verified: user.is_verified,
        language_preference: user.language_preference,
        emergency_contact: user.emergency_contact,
        address: user.address,
        created_at: user.created_at
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile'
    });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { name, email, language_preference, emergency_contact, address } = req.body;

    if (email && email !== req.user.email) {
      const existingEmail = await findByEmail(email);
      if (existingEmail) {
        return res.status(409).json({
          success: false,
          message: 'Email already in use'
        });
      }
    }

    const user = await updateUser(req.user.id, {
      name,
      email,
      language_preference,
      emergency_contact,
      address
    });

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user.id,
        phone: user.phone,
        email: user.email,
        name: user.name,
        profile_photo: user.profile_photo,
        language_preference: user.language_preference,
        emergency_contact: user.emergency_contact,
        address: user.address
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
};

exports.updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current and new password are required'
      });
    }

    const user = await findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.password) {
      const isPasswordValid = await verifyPassword(currentPassword, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }
    }

    await updatePassword(req.user.id, newPassword);

    res.status(200).json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    console.error('Update password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update password'
    });
  }
};

exports.uploadProfilePhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const user = await updateUser(req.user.id, {
      profile_photo: req.file.path
    });

    res.status(200).json({
      success: true,
      message: 'Profile photo uploaded successfully',
      profile_photo: user.profile_photo
    });
  } catch (error) {
    console.error('Upload photo error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload profile photo'
    });
  }
};

exports.resendOTP = async (req, res) => {
  try {
    const { email, type } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const user = await findByEmail(email);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const recentOTP = await pool.query(
      `SELECT * FROM otp_verifications 
       WHERE email = $1 AND type = $2 
       AND is_used = false AND created_at > NOW() - INTERVAL '1 minute'
       ORDER BY created_at DESC LIMIT 1`,
      [email, type || 'registration']
    );

    if (recentOTP.rows.length > 0) {
      return res.status(429).json({
        success: false,
        message: 'Please wait 1 minute before requesting a new OTP'
      });
    }

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 1 * 60 * 1000);

    await pool.query(
      `INSERT INTO otp_verifications (email, otp, type, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [email, otp, type || 'registration', expiresAt]
    );

    const emailSent = await sendEmailOTP(email, otp);
    if (!emailSent) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send OTP email'
      });
    }

    res.status(200).json({
      success: true,
      message: 'OTP resent successfully to your email',
      expiresAt
    });
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resend OTP'
    });
  }
};
