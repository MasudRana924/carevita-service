const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.unauthorized('Authentication required');
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.forbidden('Insufficient permissions');
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

module.exports = {
  authorize,
  authorizeOwnerOrAdmin
};
