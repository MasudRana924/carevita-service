const responseHandler = (req, res, next) => {
  res.success = (data, message = 'Operation successful', meta = {}) => {
    res.status(200).json({
      success: true,
      message,
      data,
      meta
    });
  };

  res.created = (data, message = 'Resource created successfully', meta = {}) => {
    res.status(201).json({
      success: true,
      message,
      data,
      meta
    });
  };

  res.error = (message = 'Operation failed', errors = [], statusCode = 400) => {
    res.status(statusCode).json({
      success: false,
      message,
      errors
    });
  };

  res.badRequest = (message = 'Bad request', errors = []) => {
    res.status(400).json({
      success: false,
      message,
      errors
    });
  };

  res.notFound = (message = 'Resource not found') => {
    res.status(404).json({
      success: false,
      message
    });
  };

  res.unauthorized = (message = 'Authentication required') => {
    res.status(401).json({
      success: false,
      message
    });
  };

  res.forbidden = (message = 'Access denied') => {
    res.status(403).json({
      success: false,
      message
    });
  };

  res.serverError = (message = 'Internal server error') => {
    res.status(500).json({
      success: false,
      message
    });
  };

  next();
};

module.exports = responseHandler;
