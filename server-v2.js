const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const { testConnection, initializeDatabase } = require('./config/database');

// Import middleware
const { apiLimiter, consentSubmitLimiter, loginLimiter, exportLimiter, uploadLimiter } = require('./middleware/rateLimit');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { requestLogger, errorLogger } = require('./middleware/logger');

// Import routes - original
const consentRoutes = require('./routes/consent');
const exportRoutes = require('./routes/export');
const uploadRoutes = require('./routes/upload');

// Import routes - enhanced
const consentV2Routes = require('./routes/consent-v2');
const adminRoutes = require('./routes/admin');
const uploadV2Routes = require('./routes/upload-v2');
const versionTargetingRoutes = require('./routes/version-targeting');
const healthRoutes = require('./routes/health');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = process.env.NODE_ENV === 'production' 
      ? (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean)
      : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3003', 'http://127.0.0.1:3000'];
    
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
  maxAge: 86400 // 24 hours
};

app.use(cors(corsOptions));

// Body parsing middleware with size limits
app.use(express.json({ 
  limit: process.env.JSON_LIMIT || '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf.toString('utf8');
  }
}));

app.use(express.urlencoded({ 
  extended: true, 
  limit: process.env.URL_LIMIT || '10mb' 
}));

// Trust proxy for accurate IP addresses
app.set('trust proxy', process.env.TRUST_PROXY === 'true' || 1);

// Request logging middleware
app.use(requestLogger);

// Health check endpoints (no rate limiting)
app.use('/api/health', healthRoutes);

// API routes with specific rate limiters

// Original routes (backward compatibility)
app.use('/api/consent', apiLimiter, consentRoutes);
app.use('/api/export', exportLimiter, exportRoutes);
app.use('/api/upload', uploadLimiter, uploadRoutes);

// Enhanced routes
app.use('/api/v2/consent', consentV2Routes);
app.use('/api/admin', adminRoutes); // Admin routes have their own rate limiting
app.use('/api/v2/upload', uploadV2Routes);
app.use('/api/consent/version-targeting', versionTargetingRoutes);

// Static file serving for uploaded consent versions (protected)
if (process.env.SERVE_STATIC_FILES === 'true') {
  const path = require('path');
  app.use('/static/consent-versions', express.static(path.join(__dirname, 'uploads', 'consent-versions')));
}

// API documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'Consent Management API',
    version: process.env.API_VERSION || '2.0.0',
    endpoints: {
      health: {
        '/api/health': 'Basic health check',
        '/api/health/detailed': 'Detailed system health',
        '/api/health/ready': 'Readiness check',
        '/api/health/live': 'Liveness check'
      },
      public: {
        '/api/v2/consent/initial': 'POST - Initial consent registration',
        '/api/v2/consent/submit': 'POST - Full consent submission',
        '/api/v2/consent/check/:idPassport': 'GET - Check consent status',
        '/api/v2/consent/active-version': 'GET - Get active consent version',
        '/api/v2/consent/targeted-version/:idPassport': 'GET - Get targeted consent version'
      },
      admin: {
        '/api/admin/login': 'POST - Admin login',
        '/api/admin/logout': 'POST - Admin logout',
        '/api/admin/profile': 'GET - Admin profile',
        '/api/admin/change-password': 'POST - Change password',
        '/api/admin/stats': 'GET - Dashboard statistics',
        '/api/admin/consents': 'GET - List consents',
        '/api/admin/consents/:id/withdraw': 'PUT - Withdraw consent'
      },
      versionManagement: {
        '/api/v2/upload/consent-version': 'POST - Upload new consent version',
        '/api/v2/upload/consent-versions': 'GET - List consent versions',
        '/api/v2/upload/consent-version/:id': 'GET - Get version details',
        '/api/v2/upload/consent-version/:id/toggle': 'PUT - Toggle active status',
        '/api/v2/upload/consent-version/:id/download': 'GET - Download version file',
        '/api/v2/upload/consent-version/:id': 'DELETE - Delete version'
      },
      targeting: {
        '/api/consent/version-targeting': 'POST - Create targeting',
        '/api/consent/version-targeting': 'GET - List targeting',
        '/api/consent/version-targeting/:id/toggle': 'PUT - Toggle targeting',
        '/api/consent/version-targeting/:id': 'DELETE - Delete targeting',
        '/api/consent/version-targeting/bulk': 'POST - Bulk create targeting'
      },
      export: {
        '/api/export/excel': 'GET - Export to Excel',
        '/api/export/csv': 'GET - Export to CSV'
      },
      legacy: {
        '/api/consent/submit': 'POST - Legacy consent submission',
        '/api/consent/list': 'GET - Legacy consent list',
        '/api/consent/check/:idPassport': 'GET - Legacy consent check'
      }
    }
  });
});

// 404 handler
app.use(notFoundHandler);

// Error logging middleware
app.use(errorLogger);

// Global error handler
app.use(errorHandler);

// Graceful shutdown handler
const gracefulShutdown = () => {
  console.log('🛑 Received shutdown signal, closing server gracefully...');
  
  server.close(() => {
    console.log('✅ HTTP server closed');
    
    // Close database connections
    require('./config/database').pool.end(() => {
      console.log('✅ Database connections closed');
      process.exit(0);
    });
  });
  
  // Force close after 30 seconds
  setTimeout(() => {
    console.error('⚠️ Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Uncaught exception handler
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start server
let server;

const startServer = async () => {
  try {
    console.log('🔄 Starting Consent Management Server...');
    
    // Test database connection
    console.log('📊 Testing database connection...');
    const dbConnected = await testConnection();
    if (!dbConnected) {
      console.error('❌ Cannot start server: Database connection failed');
      process.exit(1);
    }
    
    // Initialize database tables
    console.log('🗄️ Initializing database tables...');
    await initializeDatabase();
    
    // Start listening
    server = app.listen(PORT, '0.0.0.0', () => {
      console.log('═══════════════════════════════════════════════════');
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log('═══════════════════════════════════════════════════');
      console.log('📍 API Endpoints:');
      console.log(`   • Health: http://localhost:${PORT}/api/health`);
      console.log(`   • API Docs: http://localhost:${PORT}/api`);
      console.log(`   • Public Consent: http://localhost:${PORT}/api/v2/consent`);
      console.log(`   • Admin: http://localhost:${PORT}/api/admin`);
      console.log(`   • Export: http://localhost:${PORT}/api/export`);
      console.log('═══════════════════════════════════════════════════');
      
      if (process.env.NODE_ENV === 'development') {
        console.log('⚠️  Development mode - Extended error messages enabled');
      }
    });
    
    server.on('error', (error) => {
      if (error.syscall !== 'listen') {
        throw error;
      }
      
      switch (error.code) {
        case 'EACCES':
          console.error(`❌ Port ${PORT} requires elevated privileges`);
          process.exit(1);
          break;
        case 'EADDRINUSE':
          console.error(`❌ Port ${PORT} is already in use`);
          process.exit(1);
          break;
        default:
          throw error;
      }
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    if (process.env.NODE_ENV === 'development') {
      console.error(error.stack);
    }
    process.exit(1);
  }
};

// Start the server
startServer();

module.exports = app;
