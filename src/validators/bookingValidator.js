const { body, param, query } = require('express-validator');

/**
 * Booking Request Validators
 * Validation rules for booking-related requests
 */

const createBookingValidation = [
  body('family_member_id')
    .notEmpty().withMessage('family_member_id is required')
    .isUUID().withMessage('family_member_id must be a valid UUID'),
  
  body('service_type')
    .optional()
    .isIn(['HOSPITAL_ASSISTANCE', 'HOME_CARE']).withMessage('Invalid service type'),
  
  body('provider_id')
    .optional()
    .isUUID().withMessage('provider_id must be a valid UUID'),
  
  body('requested_provider_type')
    .optional()
    .isIn(['CAREGIVER', 'NURSE']).withMessage('Invalid provider type'),
  
  body('booking_date')
    .notEmpty().withMessage('booking_date is required')
    .isISO8601().withMessage('booking_date must be a valid date'),
  
  body('start_time')
    .notEmpty().withMessage('start_time is required')
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('start_time must be in HH:MM format'),
  
  body('duration_hours')
    .notEmpty().withMessage('duration_hours is required')
    .isInt({ min: 1, max: 24 }).withMessage('duration_hours must be between 1 and 24'),
  
  body('patient_requirements')
    .optional()
    .isString().withMessage('patient_requirements must be a string')
    .trim()
    .isLength({ max: 500 }).withMessage('patient_requirements must not exceed 500 characters'),
  
  body('notes')
    .optional()
    .isString().withMessage('notes must be a string')
    .trim()
    .isLength({ max: 500 }).withMessage('notes must not exceed 500 characters'),
  
  body('pickup_location')
    .optional()
    .isObject().withMessage('pickup_location must be an object'),
  
  body('pickup_location.address')
    .optional()
    .isString().withMessage('address must be a string'),
  
  body('pickup_location.latitude')
    .optional()
    .isFloat({ min: -90, max: 90 }).withMessage('latitude must be between -90 and 90'),
  
  body('pickup_location.longitude')
    .optional()
    .isFloat({ min: -180, max: 180 }).withMessage('longitude must be between -180 and 180')
];

const getBookingsValidation = [
  query('status')
    .optional()
    .isIn([
      'SEARCHING_PROVIDER',
      'PROVIDER_ASSIGNED',
      'PROVIDER_ACCEPTED',
      'PAYMENT_PAID',
      'SERVICE_IN_PROGRESS',
      'SERVICE_COMPLETED',
      'CANCELLED_BY_USER',
      'CANCELLED_BY_PROVIDER',
      'CANCELLED_BY_ADMIN'
    ]).withMessage('Invalid status'),
  
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100')
];

const getBookingValidation = [
  param('id')
    .notEmpty().withMessage('Booking ID is required')
    .isUUID().withMessage('Booking ID must be a valid UUID')
];

const acceptBookingValidation = [
  param('id')
    .notEmpty().withMessage('Booking ID is required')
    .isUUID().withMessage('Booking ID must be a valid UUID')
];

const rejectBookingValidation = [
  param('id')
    .notEmpty().withMessage('Booking ID is required')
    .isUUID().withMessage('Booking ID must be a valid UUID'),
  
  body('reason')
    .optional()
    .isString().withMessage('reason must be a string')
    .trim()
    .isLength({ max: 500 }).withMessage('reason must not exceed 500 characters')
];

const cancelBookingValidation = [
  param('id')
    .notEmpty().withMessage('Booking ID is required')
    .isUUID().withMessage('Booking ID must be a valid UUID'),
  
  body('reason')
    .optional()
    .isString().withMessage('reason must be a string')
    .trim()
    .isLength({ max: 500 }).withMessage('reason must not exceed 500 characters')
];

const startBookingValidation = [
  param('id')
    .notEmpty().withMessage('Booking ID is required')
    .isUUID().withMessage('Booking ID must be a valid UUID'),
  
  body('latitude')
    .notEmpty().withMessage('latitude is required')
    .isFloat({ min: -90, max: 90 }).withMessage('latitude must be between -90 and 90'),
  
  body('longitude')
    .notEmpty().withMessage('longitude is required')
    .isFloat({ min: -180, max: 180 }).withMessage('longitude must be between -180 and 180'),
  
  body('accuracy')
    .optional()
    .isFloat({ min: 0 }).withMessage('accuracy must be a positive number'),
  
  body('heading')
    .optional()
    .isFloat({ min: 0, max: 360 }).withMessage('heading must be between 0 and 360'),
  
  body('speed')
    .optional()
    .isFloat({ min: 0 }).withMessage('speed must be a positive number')
];

const completeBookingValidation = [
  param('id')
    .notEmpty().withMessage('Booking ID is required')
    .isUUID().withMessage('Booking ID must be a valid UUID')
];

const submitReviewValidation = [
  param('id')
    .notEmpty().withMessage('Booking ID is required')
    .isUUID().withMessage('Booking ID must be a valid UUID'),
  
  body('rating')
    .notEmpty().withMessage('rating is required')
    .isInt({ min: 1, max: 5 }).withMessage('rating must be between 1 and 5'),
  
  body('comment')
    .optional()
    .isString().withMessage('comment must be a string')
    .trim()
    .isLength({ max: 1000 }).withMessage('comment must not exceed 1000 characters')
];

const createDisputeValidation = [
  param('booking_id')
    .notEmpty().withMessage('Booking ID is required')
    .isUUID().withMessage('Booking ID must be a valid UUID'),
  
  body('reason')
    .notEmpty().withMessage('reason is required')
    .isString().withMessage('reason must be a string')
    .trim()
    .isLength({ min: 10, max: 500 }).withMessage('reason must be between 10 and 500 characters'),
  
  body('details')
    .optional()
    .isString().withMessage('details must be a string')
    .trim()
    .isLength({ max: 2000 }).withMessage('details must not exceed 2000 characters')
];

const updateLiveLocationValidation = [
  param('id')
    .notEmpty().withMessage('Booking ID is required')
    .isUUID().withMessage('Booking ID must be a valid UUID'),
  
  body('latitude')
    .notEmpty().withMessage('latitude is required')
    .isFloat({ min: -90, max: 90 }).withMessage('latitude must be between -90 and 90'),
  
  body('longitude')
    .notEmpty().withMessage('longitude is required')
    .isFloat({ min: -180, max: 180 }).withMessage('longitude must be between -180 and 180'),
  
  body('accuracy')
    .optional()
    .isFloat({ min: 0 }).withMessage('accuracy must be a positive number'),
  
  body('heading')
    .optional()
    .isFloat({ min: 0, max: 360 }).withMessage('heading must be between 0 and 360'),
  
  body('speed')
    .optional()
    .isFloat({ min: 0 }).withMessage('speed must be a positive number')
];

module.exports = {
  createBookingValidation,
  getBookingsValidation,
  getBookingValidation,
  acceptBookingValidation,
  rejectBookingValidation,
  cancelBookingValidation,
  startBookingValidation,
  completeBookingValidation,
  submitReviewValidation,
  createDisputeValidation,
  updateLiveLocationValidation
};
