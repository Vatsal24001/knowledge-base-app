const { v4: uuidv4 } = require('uuid');

/**
 * Middleware to add a unique request ID to each request
 * This helps with tracking requests through logs and error reports
 */
const requestIdMiddleware = (req, res, next) => {
  // Generate a unique request ID
  req.id = uuidv4();
  
  // Add request ID to response headers
  res.setHeader('X-Request-ID', req.id);
  
  next();
};

module.exports = requestIdMiddleware; 