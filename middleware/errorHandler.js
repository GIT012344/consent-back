// Error handling middleware
const errorHandler = (err, req, res, next) => {
  // Log error
  console.error(`[${new Date().toISOString()}] Error:`, err.stack);
  
  // Default error
  let status = err.status || 500;
  let message = err.message || 'Internal Server Error';
  
  // Handle specific error types
  if (err.name === 'ValidationError') {
    status = 400;
    message = 'ข้อมูลไม่ถูกต้อง';
  } else if (err.name === 'UnauthorizedError') {
    status = 401;
    message = 'ไม่มีสิทธิ์เข้าถึง';
  } else if (err.name === 'JsonWebTokenError') {
    status = 401;
    message = 'Token ไม่ถูกต้อง';
  } else if (err.name === 'TokenExpiredError') {
    status = 401;
    message = 'Token หมดอายุ';
  } else if (err.code === '23505') { // PostgreSQL unique violation
    status = 409;
    message = 'ข้อมูลซ้ำในระบบ';
  } else if (err.code === '23503') { // PostgreSQL foreign key violation
    status = 400;
    message = 'ข้อมูลอ้างอิงไม่ถูกต้อง';
  }
  
  // Send error response
  res.status(status).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack,
      details: err 
    })
  });
};

// Not found handler
const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    error: 'ไม่พบ endpoint ที่ร้องขอ'
  });
};

// Async error wrapper
const asyncWrapper = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncWrapper
};
