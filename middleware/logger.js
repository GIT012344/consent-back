const fs = require('fs');
const path = require('path');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Logger middleware
const logger = (req, res, next) => {
  const start = Date.now();
  const timestamp = new Date().toISOString();
  
  // Log request
  const requestLog = `[${timestamp}] ${req.method} ${req.path} - IP: ${req.ip}`;
  console.log(requestLog);
  
  // Capture response
  const originalSend = res.send;
  res.send = function(data) {
    const duration = Date.now() - start;
    const responseLog = `[${timestamp}] ${req.method} ${req.path} - Status: ${res.statusCode} - Duration: ${duration}ms`;
    
    // Log to console
    if (res.statusCode >= 400) {
      console.error(responseLog);
    } else {
      console.log(responseLog);
    }
    
    // Log to file (optional - for production)
    if (process.env.NODE_ENV === 'production') {
      const logFile = path.join(logsDir, `${new Date().toISOString().split('T')[0]}.log`);
      const logEntry = `${responseLog}\n`;
      fs.appendFileSync(logFile, logEntry);
    }
    
    originalSend.call(this, data);
  };
  
  next();
};

// Error logger
const errorLogger = (error, req, res, next) => {
  const timestamp = new Date().toISOString();
  const errorLog = `[${timestamp}] ERROR: ${req.method} ${req.path} - ${error.message}\n${error.stack}`;
  
  console.error(errorLog);
  
  // Log to file in production
  if (process.env.NODE_ENV === 'production') {
    const errorFile = path.join(logsDir, `error-${new Date().toISOString().split('T')[0]}.log`);
    fs.appendFileSync(errorFile, `${errorLog}\n---\n`);
  }
  
  next(error);
};

module.exports = {
  logger,
  errorLogger
};
