const { validationResult } = require('express-validator');
const { ERROR_CODES } = require('../utils/apiResponse');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.error(
      'Validation failed',
      errors.array().map((item) => ({
        field: item.path || item.param,
        message: item.msg
      })),
      400,
      ERROR_CODES.VALIDATION_ERROR
    );
  }
  next();
};

module.exports = validate;
