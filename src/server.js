const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const morgan = require('morgan');

// Load environment variables
dotenv.config();

// Import middleware
const requestIdMiddleware = require('./middleware/requestId');
const { 
  globalErrorHandler, 
  handleUnhandledRejections, 
  handleUncaughtExceptions,
  handleGracefulShutdown 
} = require('./middleware/errorHandler');

// Import logger
const logger = require('./utils/logger');

// Import routes
const ingestionRoutes = require('./routes/ingestion');
const queryRoutes = require('./routes/query');

const app = express();
const PORT = process.env.PORT || 3000;

// Set up process error handlers
handleUnhandledRejections();
handleUncaughtExceptions();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request ID middleware (must be early in the chain)
app.use(requestIdMiddleware);

// HTTP request logging
app.use(morgan('combined', { stream: logger.stream }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'Knowledge Base API',
    requestId: req.id
  });
});

// API routes
app.use('/api/ingestion', ingestionRoutes);
app.use('/api/query', queryRoutes);

// 404 handler (must be before global error handler)
app.use('*', (req, res) => {
  res.status(404).json({
    error: {
      message: 'The requested endpoint does not exist',
      statusCode: 404,
      timestamp: new Date().toISOString(),
      path: req.originalUrl,
      method: req.method,
      requestId: req.id
    }
  });
});

// Global error handling middleware (must be last)
app.use(globalErrorHandler);

// Start server with graceful shutdown handling
const server = app.listen(PORT, () => {
  logger.info(`🚀 Knowledge Base API server running on port ${PORT}`);
  logger.info(`📊 Health check: http://localhost:${PORT}/health`);
  logger.info(`📚 Ingestion API: http://localhost:${PORT}/api/ingestion`);
  logger.info(`🔍 Query API: http://localhost:${PORT}/api/query`);
});

// Set up graceful shutdown
handleGracefulShutdown(server);

module.exports = app; 