const winston = require('winston');
const path = require('path');

/**
 * Logger Configuration
 * Structured logging with Winston
 */
const logDir = path.join(__dirname, '../../logs');

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ level, message, timestamp, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(metadata).length > 0) {
      msg += ` ${JSON.stringify(metadata)}`;
    }
    return msg;
  })
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'caremate-api' },
  transports: [
    // Write all logs to combined.log
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 5
    }),
    // Write error logs to error.log
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 5
    })
  ]
});

// Add console transport in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat
  }));
}

/**
 * Log request middleware
 */
const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info('HTTP Request', {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent')
    });
  });
  
  next();
};

/**
 * Log error middleware
 */
const errorLogger = (err, req, res, next) => {
  logger.error('Error occurred', {
    error: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userId: req.user?.id
  });
  next(err);
};

/**
 * Log database query
 */
const logQuery = (query, params, duration) => {
  logger.debug('Database Query', {
    query: query.substring(0, 200),
    params,
    duration: `${duration}ms`
  });
};

/**
 * Log external API call
 */
const logExternalApi = (url, method, status, duration) => {
  logger.info('External API Call', {
    url,
    method,
    status,
    duration: `${duration}ms`
  });
};

/**
 * Log cache operation
 */
const logCache = (operation, key, hit) => {
  logger.debug('Cache Operation', {
    operation,
    key,
    hit
  });
};

/**
 * Log business event
 */
const logEvent = (event, data) => {
  logger.info('Business Event', {
    event,
    ...data
  });
};

/**
 * Log security event
 */
const logSecurity = (event, data) => {
  logger.warn('Security Event', {
    event,
    ...data
  });
};

module.exports = {
  logger,
  requestLogger,
  errorLogger,
  logQuery,
  logExternalApi,
  logCache,
  logEvent,
  logSecurity
};
