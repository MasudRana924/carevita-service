const { sendFail, ERROR_CODES } = require('../utils/apiResponse');

const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  console.error(err.stack || err);

  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return sendFail(req, res, {
      message: 'Invalid JSON payload',
      statusCode: 400,
      code: ERROR_CODES.VALIDATION_ERROR
    });
  }

  if (err.name === 'MulterError') {
    return sendFail(req, res, {
      message: err.message || 'File upload failed',
      statusCode: 400,
      code: ERROR_CODES.VALIDATION_ERROR
    });
  }

  if (err.name === 'ValidationError' || err.isJoi) {
    return sendFail(req, res, {
      message: 'Validation failed',
      statusCode: 400,
      code: ERROR_CODES.VALIDATION_ERROR,
      errors: err.errors || err.details || []
    });
  }

  if (err.name === 'JsonWebTokenError') {
    return sendFail(req, res, {
      message: 'Invalid token',
      statusCode: 401,
      code: ERROR_CODES.TOKEN_INVALID
    });
  }

  if (err.name === 'TokenExpiredError') {
    return sendFail(req, res, {
      message: 'Token expired',
      statusCode: 401,
      code: ERROR_CODES.TOKEN_EXPIRED
    });
  }

  if (err.code === '23505') {
    return sendFail(req, res, {
      message: 'Duplicate entry',
      statusCode: 409,
      code: ERROR_CODES.DUPLICATE_ENTRY
    });
  }

  if (err.code === '23503') {
    return sendFail(req, res, {
      message: 'Related record not found',
      statusCode: 400,
      code: ERROR_CODES.FOREIGN_KEY_VIOLATION
    });
  }

  const knownCodes = new Set(Object.values(ERROR_CODES));
  const statusCode = err.statusCode || err.status || 500;
  const isProduction = process.env.NODE_ENV === 'production';
  const message = statusCode >= 500 && isProduction
    ? 'Internal server error'
    : (err.message || 'Internal server error');

  const code = knownCodes.has(err.code)
    ? err.code
    : (statusCode >= 500 ? ERROR_CODES.INTERNAL_ERROR : ERROR_CODES.BAD_REQUEST);

  return sendFail(req, res, {
    message,
    statusCode,
    code,
    errors: err.errors || []
  });
};

module.exports = errorHandler;
