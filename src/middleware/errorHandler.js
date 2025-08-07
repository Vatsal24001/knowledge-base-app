const logger = require('../utils/logger');

// Custom error classes
class AppError extends Error {
  constructor(message, statusCode, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message) {
    super(message, 400);
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401);
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403);
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404);
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(message, 409);
  }
}

class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, 429);
  }
}

// Error response formatter
const formatErrorResponse = (err, req) => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  const baseResponse = {
    error: {
      message: err.message || 'Internal Server Error',
      statusCode: err.statusCode || 500,
      timestamp: new Date().toISOString(),
      path: req.originalUrl,
      method: req.method,
      requestId: req.id || 'unknown'
    }
  };

  // Add stack trace in development
  if (isDevelopment && err.stack) {
    baseResponse.error.stack = err.stack;
  }

  // Add additional details for specific error types
  if (err.details) {
    baseResponse.error.details = err.details;
  }

  // Add validation errors if present
  if (err.errors && Array.isArray(err.errors)) {
    baseResponse.error.validationErrors = err.errors;
  }

  return baseResponse;
};

// Async error wrapper
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Global error handling middleware
const globalErrorHandler = (err, req, res, next) => {
  // Set default values
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Log the error
  logger.error('Global Error Handler:', {
    error: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    requestId: req.id || 'unknown'
  });

  // Handle specific error types
  if (err.name === 'ValidationError') {
    err.statusCode = 400;
    err.message = 'Validation Error';
  }

  if (err.name === 'CastError') {
    err.statusCode = 400;
    err.message = 'Invalid ID format';
  }

  if (err.code === 11000) {
    err.statusCode = 409;
    err.message = 'Duplicate field value';
  }

  if (err.name === 'JsonWebTokenError') {
    err.statusCode = 401;
    err.message = 'Invalid token';
  }

  if (err.name === 'TokenExpiredError') {
    err.statusCode = 401;
    err.message = 'Token expired';
  }

  if (err.name === 'MulterError') {
    err.statusCode = 400;
    err.message = 'File upload error';
  }

  // Handle unhandled promise rejections
  if (err.code === 'UNHANDLED_PROMISE_REJECTION') {
    err.statusCode = 500;
    err.message = 'Unhandled Promise Rejection';
  }

  // Handle database connection errors
  if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
    err.statusCode = 503;
    err.message = 'Service temporarily unavailable';
  }

  // Handle timeout errors
  if (err.code === 'ETIMEDOUT') {
    err.statusCode = 408;
    err.message = 'Request timeout';
  }

  // Format error response
  const errorResponse = formatErrorResponse(err, req);

  // Send error response
  res.status(err.statusCode).json(errorResponse);
};

// Unhandled rejection handler
const handleUnhandledRejections = () => {
  process.on('unhandledRejection', (err) => {
    logger.error('UNHANDLED REJECTION! 💥 Shutting down...', {
      error: err.message,
      stack: err.stack
    });
    
    process.exit(1);
  });
};

// Uncaught exception handler
const handleUncaughtExceptions = () => {
  process.on('uncaughtException', (err) => {
    logger.error('UNCAUGHT EXCEPTION! 💥 Shutting down...', {
      error: err.message,
      stack: err.stack
    });
    
    process.exit(1);
  });
};

// Graceful shutdown handler
const handleGracefulShutdown = (server) => {
  const shutdown = (signal) => {
    logger.info(`Received ${signal}. Starting graceful shutdown...`);
    
    server.close(() => {
      logger.info('Process terminated!');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  asyncHandler,
  globalErrorHandler,
  handleUnhandledRejections,
  handleUncaughtExceptions,
  handleGracefulShutdown
}; 