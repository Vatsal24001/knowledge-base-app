const winston = require('winston');
const path = require('path');

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Tell winston that you want to link the colors
winston.addColors(colors);

// Define which level to log based on environment
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';
  return isDevelopment ? 'debug' : 'warn';
};

// Define different log formats
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`,
  ),
);

// Define file format (without colors for file logging)
const fileLogFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

// Define transports
const transports = [
  // Console transport
  new winston.transports.Console({
    format: logFormat,
  }),
  
  // Error log file
  new winston.transports.File({
    filename: path.join(__dirname, '../../logs/error.log'),
    level: 'error',
    format: fileLogFormat,
  }),
  
  // Combined log file
  new winston.transports.File({
    filename: path.join(__dirname, '../../logs/combined.log'),
    format: fileLogFormat,
  }),
];

// Create the logger
const logger = winston.createLogger({
  level: level(),
  levels,
  transports,
  exitOnError: false,
});

// Create a stream object for Morgan HTTP logging
logger.stream = {
  write: (message) => logger.http(message.trim()),
};

module.exports = logger; 