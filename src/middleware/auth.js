const { verifyToken } = require('../config/jwt');
const pool = require('../config/database');
const { ERROR_CODES } = require('../utils/apiResponse');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.unauthorized('Access denied. No token provided.');
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    const result = await pool.query(
      'SELECT id, phone, email, role, status FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.unauthorized('Invalid token. User not found.', ERROR_CODES.TOKEN_INVALID);
    }

    const user = result.rows[0];

    if (user.status !== 'active') {
      return res.forbidden('Account is not active.', ERROR_CODES.ACCOUNT_INACTIVE);
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    const code = error.name === 'TokenExpiredError'
      ? ERROR_CODES.TOKEN_EXPIRED
      : ERROR_CODES.TOKEN_INVALID;
    return res.unauthorized(
      error.name === 'TokenExpiredError' ? 'Token expired.' : 'Invalid token.',
      code
    );
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.forbidden('Not authorized to access this resource.');
    }
    next();
  };
};

const authorizeOwnerOrAdmin = (getResourceUserId) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.unauthorized('Authentication required');
    }

    if (req.user.role === 'ADMIN') {
      return next();
    }

    const resourceUserId = await getResourceUserId(req);
    if (req.user.id !== resourceUserId) {
      return res.forbidden('Access denied');
    }

    next();
  };
};

const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'ADMIN') {
    return res.forbidden('Admin access required');
  }
  next();
};

module.exports = { authenticate, authorize, authorizeOwnerOrAdmin, requireAdmin };
