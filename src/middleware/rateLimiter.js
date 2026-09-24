const rateLimit = require('express-rate-limit');
const { sendFail, ERROR_CODES } = require('../utils/apiResponse');

const tooMany = (message) => (req, res) => {
  sendFail(req, res, {
    message,
    statusCode: 429,
    code: ERROR_CODES.TOO_MANY_REQUESTS
  });
};

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  handler: tooMany('Too many authentication attempts, please try again later.')
});

/** Stricter limiter for OTP send/verify. */
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: tooMany('Too many OTP attempts, please try again later.')
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: tooMany('Too many login attempts, please try again later.')
});

const bookingWriteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: tooMany('Too many booking requests, please try again later.')
});

const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: tooMany('Too many payment requests, please try again later.')
});

const withdrawalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: tooMany('Too many withdrawal requests, please try again later.')
});

const reviewLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: tooMany('Too many review submissions, please try again later.')
});

const safetyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: tooMany('Too many safety reports, please try again later.')
});

const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  handler: tooMany('Too many webhook requests.')
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    const path = (req.originalUrl || req.url || '').split('?')[0];
    return /\/ekyc\/webhook\/?$/.test(path) || 
           /\/payments\/bkash\/callback\/?$/.test(path) ||
           /\/admin\/.*/.test(path); // Skip rate limiting for admin routes
  },
  handler: tooMany('Too many requests, please try again later.')
});

module.exports = {
  authLimiter,
  otpLimiter,
  loginLimiter,
  bookingWriteLimiter,
  paymentLimiter,
  withdrawalLimiter,
  reviewLimiter,
  safetyLimiter,
  webhookLimiter,
  apiLimiter
};
