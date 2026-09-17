const rateLimit = require('express-rate-limit');
const { sendFail, ERROR_CODES } = require('../utils/apiResponse');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    sendFail(req, res, {
      message: 'Too many authentication attempts, please try again later.',
      statusCode: 429,
      code: ERROR_CODES.TOO_MANY_REQUESTS
    });
  }
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    const path = (req.originalUrl || req.url || '').split('?')[0];
    return /\/ekyc\/webhook\/?$/.test(path);
  },
  handler: (req, res) => {
    sendFail(req, res, {
      message: 'Too many requests, please try again later.',
      statusCode: 429,
      code: ERROR_CODES.TOO_MANY_REQUESTS
    });
  }
});

module.exports = { authLimiter, apiLimiter };
