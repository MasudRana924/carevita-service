const { body, param, query } = require('express-validator');

/**
 * Caregiver Request Validators
 * Validation rules for caregiver-related requests
 */

const createProfileValidation = [
  body('bio')
    .optional()
    .isString().withMessage('bio must be a string')
    .trim()
    .isLength({ max: 1000 }).withMessage('bio must not exceed 1000 characters'),
  
  body('experience_years')
    .optional()
    .isInt({ min: 0, max: 50 }).withMessage('experience_years must be between 0 and 50'),
  
  body('service_areas')
    .optional()
    .isArray().withMessage('service_areas must be an array'),
  
  body('service_areas.*')
    .optional()
    .isString().withMessage('service area must be a string'),
  
  body('hourly_rate')
    .optional()
    .isFloat({ min: 100, max: 10000 }).withMessage('hourly_rate must be between 100 and 10000'),
  
  body('education')
    .optional()
    .isString().withMessage('education must be a string')
    .trim()
    .isLength({ max: 200 }).withMessage('education must not exceed 200 characters'),
  
  body('blood_group')
    .optional()
    .isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).withMessage('Invalid blood group'),
  
  body('date_of_birth')
    .optional()
    .isISO8601().withMessage('date_of_birth must be a valid date'),
  
  body('district')
    .optional()
    .isString().withMessage('district must be a string')
    .trim()
    .isLength({ min: 2, max: 50 }).withMessage('district must be between 2 and 50 characters'),
  
  body('thana')
    .optional()
    .isString().withMessage('thana must be a string')
    .trim()
    .isLength({ min: 2, max: 50 }).withMessage('thana must be between 2 and 50 characters'),
  
  body('gender')
    .optional()
    .isIn(['MALE', 'FEMALE', 'OTHER']).withMessage('gender must be MALE, FEMALE, or OTHER')
];

const updateProfileValidation = [
  body('bio')
    .optional()
    .isString().withMessage('bio must be a string')
    .trim()
    .isLength({ max: 1000 }).withMessage('bio must not exceed 1000 characters'),
  
  body('experience_years')
    .optional()
    .isInt({ min: 0, max: 50 }).withMessage('experience_years must be between 0 and 50'),
  
  body('service_areas')
    .optional()
    .isArray().withMessage('service_areas must be an array'),
  
  body('hourly_rate')
    .optional()
    .isFloat({ min: 100, max: 10000 }).withMessage('hourly_rate must be between 100 and 10000'),
  
  body('education')
    .optional()
    .isString().withMessage('education must be a string')
    .trim()
    .isLength({ max: 200 }).withMessage('education must not exceed 200 characters'),
  
  body('district')
    .optional()
    .isString().withMessage('district must be a string')
    .trim()
    .isLength({ min: 2, max: 50 }).withMessage('district must be between 2 and 50 characters'),
  
  body('thana')
    .optional()
    .isString().withMessage('thana must be a string')
    .trim()
    .isLength({ min: 2, max: 50 }).withMessage('thana must be between 2 and 50 characters')
];

const addServiceValidation = [
  body('service_id')
    .notEmpty().withMessage('service_id is required')
    .isUUID().withMessage('service_id must be a valid UUID'),
  
  body('custom_price')
    .optional()
    .isFloat({ min: 100, max: 10000 }).withMessage('custom_price must be between 100 and 10000')
];

const addPaymentAccountValidation = [
  body('account_type')
    .notEmpty().withMessage('account_type is required')
    .isIn(['BKASH', 'NAGAD', 'BANK']).withMessage('account_type must be BKASH, NAGAD, or BANK'),
  
  body('account_number')
    .notEmpty().withMessage('account_number is required')
    .isString().withMessage('account_number must be a string')
    .trim()
    .isLength({ min: 10, max: 20 }).withMessage('account_number must be between 10 and 20 characters'),
  
  body('account_holder_name')
    .notEmpty().withMessage('account_holder_name is required')
    .isString().withMessage('account_holder_name must be a string')
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('account_holder_name must be between 2 and 100 characters'),
  
  body('bank_name')
    .optional()
    .isString().withMessage('bank_name must be a string')
    .trim()
    .isLength({ max: 100 }).withMessage('bank_name must not exceed 100 characters'),
  
  body('routing_number')
    .optional()
    .isString().withMessage('routing_number must be a string')
    .trim()
    .isLength({ min: 9, max: 9 }).withMessage('routing_number must be 9 characters')
];

const createWithdrawalValidation = [
  body('amount')
    .notEmpty().withMessage('amount is required')
    .isFloat({ min: 500, max: 100000 }).withMessage('amount must be between 500 and 100000'),
  
  body('payment_account_id')
    .notEmpty().withMessage('payment_account_id is required')
    .isUUID().withMessage('payment_account_id must be a valid UUID')
];

const searchCaregiversValidation = [
  query('district')
    .optional()
    .isString().withMessage('district must be a string'),
  
  query('thana')
    .optional()
    .isString().withMessage('thana must be a string'),
  
  query('provider_type')
    .optional()
    .isIn(['CAREGIVER', 'NURSE']).withMessage('provider_type must be CAREGIVER or NURSE'),
  
  query('gender')
    .optional()
    .isIn(['MALE', 'FEMALE', 'OTHER']).withMessage('gender must be MALE, FEMALE, or OTHER'),
  
  query('verification_status')
    .optional()
    .isIn(['PENDING', 'APPROVED', 'REJECTED']).withMessage('verification_status must be PENDING, APPROVED, or REJECTED'),
  
  query('is_available')
    .optional()
    .isBoolean().withMessage('is_available must be a boolean'),
  
  query('min_rating')
    .optional()
    .isFloat({ min: 0, max: 5 }).withMessage('min_rating must be between 0 and 5'),
  
  query('max_hourly_rate')
    .optional()
    .isFloat({ min: 100, max: 10000 }).withMessage('max_hourly_rate must be between 100 and 10000'),
  
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100')
];

module.exports = {
  createProfileValidation,
  updateProfileValidation,
  addServiceValidation,
  addPaymentAccountValidation,
  createWithdrawalValidation,
  searchCaregiversValidation
};
