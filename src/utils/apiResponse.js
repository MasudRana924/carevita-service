const ERROR_CODES = require('../constants/errorCodes');
const { sanitize } = require('./sanitize');
const { buildPagination } = require('./pagination');

const normalizeErrors = (errors) => {
  if (!errors) return [];

  if (Array.isArray(errors)) {
    return errors
      .map((item) => {
        if (item == null) return null;
        if (typeof item === 'string') return { message: item };
        if (typeof item === 'object') {
          return {
            field: item.field || item.path || item.param || undefined,
            message: item.message || item.msg || 'Invalid value',
            code: item.code || undefined
          };
        }
        return { message: String(item) };
      })
      .filter(Boolean);
  }

  if (typeof errors === 'object') {
    return [{
      message: errors.errorMessage || errors.message || 'Request failed',
      code: errors.errorCode || errors.code || undefined
    }];
  }

  return [{ message: String(errors) }];
};

const buildMeta = (req, extra = {}) => {
  const {
    page,
    limit,
    total,
    totalPages,
    hasNext,
    hasPrev,
    pagination,
    ...rest
  } = extra || {};

  const meta = {
    requestId: req?.requestId || req?.headers?.['x-request-id'] || undefined,
    timestamp: new Date().toISOString(),
    path: req?.originalUrl || undefined
  };

  const paginationSource = pagination || (page != null || limit != null
    ? { page, limit, total, totalPages, hasNext, hasPrev }
    : null);

  if (paginationSource) {
    meta.pagination = buildPagination(paginationSource);
  }

  return { ...meta, ...rest };
};

const sendSuccess = (req, res, {
  data = null,
  message = 'Success',
  statusCode = 200,
  meta = {}
} = {}) => {
  return res.status(statusCode).json({
    success: true,
    statusCode,
    message: message || 'Success',
    data: sanitize(data === undefined ? null : data),
    meta: buildMeta(req, meta)
  });
};

const sendFail = (req, res, {
  message = 'Request failed',
  statusCode = 400,
  code = ERROR_CODES.BAD_REQUEST,
  errors = [],
  data = null
} = {}) => {
  const payload = {
    success: false,
    statusCode,
    message,
    code: code || ERROR_CODES.BAD_REQUEST,
    data: data == null ? null : sanitize(data),
    meta: buildMeta(req)
  };

  const normalized = normalizeErrors(errors);
  if (normalized.length) {
    payload.errors = normalized;
  }

  return res.status(statusCode).json(payload);
};

module.exports = {
  ERROR_CODES,
  sendSuccess,
  sendFail,
  buildMeta,
  normalizeErrors
};
