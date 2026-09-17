const { sendSuccess, sendFail, ERROR_CODES } = require('../utils/apiResponse');

const responseHandler = (req, res, next) => {
  res.success = (data = null, message = 'Success', meta = {}) =>
    sendSuccess(req, res, { data, message, statusCode: 200, meta });

  res.created = (data = null, message = 'Resource created successfully', meta = {}) =>
    sendSuccess(req, res, { data, message, statusCode: 201, meta });

  res.paginated = (data = [], pagination = {}, message = 'Success', extraMeta = {}) =>
    sendSuccess(req, res, {
      data: Array.isArray(data) ? data : [],
      message,
      statusCode: 200,
      meta: { ...extraMeta, ...pagination }
    });

  res.error = (message = 'Operation failed', errors = [], statusCode = 400, code = ERROR_CODES.BAD_REQUEST) =>
    sendFail(req, res, { message, errors, statusCode, code });

  res.badRequest = (message = 'Bad request', errors = []) =>
    sendFail(req, res, {
      message,
      errors,
      statusCode: 400,
      code: ERROR_CODES.BAD_REQUEST
    });

  res.unauthorized = (message = 'Authentication required', code = ERROR_CODES.UNAUTHORIZED) =>
    sendFail(req, res, { message, statusCode: 401, code });

  res.forbidden = (message = 'Access denied', code = ERROR_CODES.FORBIDDEN) =>
    sendFail(req, res, { message, statusCode: 403, code });

  res.notFound = (message = 'Resource not found') =>
    sendFail(req, res, {
      message,
      statusCode: 404,
      code: ERROR_CODES.NOT_FOUND
    });

  res.conflict = (message = 'Resource already exists') =>
    sendFail(req, res, {
      message,
      statusCode: 409,
      code: ERROR_CODES.CONFLICT
    });

  res.tooManyRequests = (message = 'Too many requests') =>
    sendFail(req, res, {
      message,
      statusCode: 429,
      code: ERROR_CODES.TOO_MANY_REQUESTS
    });

  res.serverError = (message = 'Internal server error') =>
    sendFail(req, res, {
      message,
      statusCode: 500,
      code: ERROR_CODES.INTERNAL_ERROR
    });

  next();
};

module.exports = responseHandler;
