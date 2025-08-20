const rateLimit = require('express-rate-limit');

// Different rate limiters for different endpoints
const createRateLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        error: message || 'Too many requests, please try again later.'
      });
    }
  });
};

// General API rate limiter
const apiLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  100, // limit each IP to 100 requests per windowMs
  'คุณส่งคำขอมากเกินไป กรุณาลองใหม่ภายหลัง'
);

// Strict rate limiter for consent submission
const consentSubmitLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  10, // limit each IP to 10 consent submissions per windowMs
  'ส่งข้อมูลมากเกินไป กรุณาลองใหม่ภายหลัง'
);

// Login rate limiter
const loginLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  5, // limit each IP to 5 login attempts per windowMs
  'พยายามเข้าสู่ระบบมากเกินไป กรุณาลองใหม่ภายหลัง'
);

// Export rate limiter
const exportLimiter = createRateLimiter(
  5 * 60 * 1000, // 5 minutes
  10, // limit each IP to 10 export requests per windowMs
  'ดาวน์โหลดมากเกินไป กรุณาลองใหม่ภายหลัง'
);

// Upload rate limiter
const uploadLimiter = createRateLimiter(
  60 * 60 * 1000, // 1 hour
  20, // limit each IP to 20 uploads per hour
  'อัพโหลดไฟล์มากเกินไป กรุณาลองใหม่ภายหลัง'
);

// Dynamic rate limiter based on user role
const createDynamicLimiter = (defaultMax = 100) => {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    max: (req) => {
      // Admin users get higher limits
      if (req.user && req.user.role === 'super_admin') {
        return defaultMax * 10;
      }
      if (req.user && req.user.role === 'admin') {
        return defaultMax * 5;
      }
      return defaultMax;
    },
    standardHeaders: true,
    legacyHeaders: false
  });
};

// IP-based rate limiter with memory store
const createIPBasedLimiter = (points = 100, duration = 900) => {
  const attempts = new Map();
  
  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    
    if (!attempts.has(ip)) {
      attempts.set(ip, { count: 1, resetTime: now + duration * 1000 });
      return next();
    }
    
    const record = attempts.get(ip);
    
    if (now > record.resetTime) {
      record.count = 1;
      record.resetTime = now + duration * 1000;
      return next();
    }
    
    if (record.count >= points) {
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);
      res.set('Retry-After', retryAfter);
      return res.status(429).json({
        success: false,
        error: 'Too many requests',
        retryAfter
      });
    }
    
    record.count++;
    next();
  };
};

// Clean up memory store periodically
setInterval(() => {
  // This would clean up any custom memory stores if needed
  // For the built-in rate limiter, cleanup is handled automatically
}, 60 * 60 * 1000); // Clean up every hour

module.exports = {
  apiLimiter,
  consentSubmitLimiter,
  loginLimiter,
  exportLimiter,
  uploadLimiter,
  createRateLimiter,
  createDynamicLimiter,
  createIPBasedLimiter
};
