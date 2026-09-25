const { body } = require('express-validator');

/**
 * Auth Request Validators
 * Validation rules for authentication-related requests
 */

const registerValidation = [
  body('phone')
    .notEmpty().withMessage('phone is required')
    .matches(/^\+8801[3-9]\d{8}$/).withMessage('phone must be a valid Bangladesh number'),
  
  body('name')
    .notEmpty().withMessage('name is required')
    .isString().withMessage('name must be a string')
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('name must be between 2 and 100 characters'),
  
  body('email')
    .optional()
    .isEmail().withMessage('email must be a valid email address')
    .normalizeEmail(),
  
  body('password')
    .notEmpty().withMessage('password is required')
    .isLength({ min: 8 }).withMessage('password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('password must contain at least one uppercase letter, one lowercase letter, and one number'),
  
  body('role')
    .optional()
    .isIn(['USER', 'CAREGIVER']).withMessage('role must be either USER or CAREGIVER')
];

const loginValidation = [
  body('phone')
    .notEmpty().withMessage('phone is required')
    .matches(/^\+8801[3-9]\d{8}$/).withMessage('phone must be a valid Bangladesh number'),
  
  body('password')
    .notEmpty().withMessage('password is required')
    .isString().withMessage('password must be a string')
];

const verifyOtpValidation = [
  body('phone')
    .notEmpty().withMessage('phone is required')
    .matches(/^\+8801[3-9]\d{8}$/).withMessage('phone must be a valid Bangladesh number'),
  
  body('otp')
    .notEmpty().withMessage('otp is required')
    .isString().withMessage('otp must be a string')
    .isLength({ min: 4, max: 6 }).withMessage('otp must be between 4 and 6 characters')
];

const refreshTokenValidation = [
  body('refresh_token')
    .notEmpty().withMessage('refresh_token is required')
    .isString().withMessage('refresh_token must be a string')
];

const logoutValidation = [
  body('refresh_token')
    .notEmpty().withMessage('refresh_token is required')
    .isString().withMessage('refresh_token must be a string')
];

module.exports = {
  registerValidation,
  loginValidation,
  verifyOtpValidation,
  refreshTokenValidation,
  logoutValidation
};
