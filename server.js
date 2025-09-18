const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { testConnection, initializeDatabase } = require('./config/database');
const consentRoutes = require('./routes/consent');
const adminStatisticsRoutes = require('./routes/admin-statistics');
const adminDashboardRoutes = require('./routes/admin-dashboard');
const adminPolicyVersionsRoutes = require('./routes/admin-policy-versions');
const adminReportsRoutes = require('./routes/admin-reports');
const simplePolicyRoutes = require('./routes/simple-policy');

const app = express();
const PORT = process.env.PORT || 3000;

// Increase limits for headers and body
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Security middleware with adjusted header size
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// CORS configuration - Updated to handle all Render frontend URLs
const corsOrigins = process.env.NODE_ENV === 'production' 
  ? [
      process.env.CORS_ORIGIN,
      'https://consent-frontend.onrender.com',
      'https://consent-frontend-hjts.onrender.com',
      'https://consent-frontend-yb6t.onrender.com', // New frontend URL
      // Add pattern to match all Render frontend URLs
      /^https:\/\/consent-frontend-[a-z0-9]+\.onrender\.com$/
    ].filter(Boolean)
  : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3003', 'http://127.0.0.1:3000'];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if origin matches any allowed origin
    const isAllowed = corsOrigins.some(allowedOrigin => {
      if (allowedOrigin instanceof RegExp) {
        return allowedOrigin.test(origin);
      }
      return allowedOrigin === origin;
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      // In production, be more permissive for Render URLs
      if (process.env.NODE_ENV === 'production' && origin.includes('.onrender.com')) {
        console.log('Allowing Render URL:', origin);
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Rate limiting - increased limits for development
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000, // increased to 1000 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for localhost in development
    const ip = req.ip || req.connection.remoteAddress;
    return process.env.NODE_ENV !== 'production' && (ip === '::1' || ip === '127.0.0.1' || ip === '::ffff:127.0.0.1');
  }
});

app.use(limiter);

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - IP: ${req.ip}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API Routes
app.use('/api/simple-policy', simplePolicyRoutes);
app.use('/api/consent', consentRoutes);
app.use('/api/consent/versions', require('./routes/consent-versions'));
app.use('/api/consent/records', require('./routes/consent-records'));
app.use('/api/titles', require('./routes/titles'));
app.use('/api/form-fields', require('./routes/form-fields'));
app.use('/api/user-types', require('./routes/user-types'));
app.use('/api/policy-versions', require('./routes/policy-versions'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/export', require('./routes/export'));
app.use('/api/admin', adminStatisticsRoutes);
app.use('/api/admin', adminDashboardRoutes);
app.use('/api', adminPolicyVersionsRoutes);
app.use('/api', adminReportsRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);
  
  res.status(error.status || 500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : error.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: error.stack })
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start server
const startServer = async () => {
  try {
    // Test database connection
    const dbConnected = await testConnection();
    if (!dbConnected) {
      console.error('❌ Cannot start server: Database connection failed');
      process.exit(1);
    }
    console.log('✅ Database connected successfully');
    
    // Initialize database tables
    await require('./models/db-init')();
    console.log('✅ Database tables initialized successfully');
    
    // Run database migrations to fix field sizes - FORCE RUN
    try {
      const { pool } = require('./config/database');
      
      // Force update field sizes directly without checking files
      console.log('🔧 Running database field size migration...');
      
      // Update consent_records table field sizes
      const updateQueries = [
        `ALTER TABLE consent_records 
         ALTER COLUMN title TYPE VARCHAR(100),
         ALTER COLUMN name_surname TYPE VARCHAR(500),
         ALTER COLUMN id_passport TYPE VARCHAR(100),
         ALTER COLUMN email TYPE VARCHAR(255),
         ALTER COLUMN phone TYPE VARCHAR(50),
         ALTER COLUMN consent_type TYPE VARCHAR(100),
         ALTER COLUMN user_type TYPE VARCHAR(100),
         ALTER COLUMN consent_version TYPE VARCHAR(100),
         ALTER COLUMN ip_address TYPE VARCHAR(100),
         ALTER COLUMN status TYPE VARCHAR(50)`,
         
        // Update consent_history if exists
        `DO $$
        BEGIN
          IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'consent_history') THEN
            ALTER TABLE consent_history
              ALTER COLUMN name_surname TYPE VARCHAR(500),
              ALTER COLUMN id_passport TYPE VARCHAR(100),
              ALTER COLUMN consent_version TYPE VARCHAR(100),
              ALTER COLUMN consent_type TYPE VARCHAR(100),
              ALTER COLUMN user_type TYPE VARCHAR(100);
          END IF;
        END $$`,
        
        // Add indexes for performance
        `CREATE INDEX IF NOT EXISTS idx_consent_records_id_passport ON consent_records(id_passport)`,
        `CREATE INDEX IF NOT EXISTS idx_consent_records_user_type ON consent_records(user_type)`,
        `CREATE INDEX IF NOT EXISTS idx_consent_records_created_date ON consent_records(created_date)`
      ];
      
      // Execute each query
      for (const query of updateQueries) {
        try {
          await pool.query(query);
        } catch (err) {
          if (err.code !== '42701' && err.code !== '42P07') { // Ignore already exists errors
            console.log('⚠️ Migration query warning:', err.message);
          }
        }
      }
      
      console.log('✅ Database field sizes migration completed');
      
    } catch (error) {
      console.error('❌ Critical migration error:', error.message);
      // Don't stop server, but log the error
    }
    
    // Start listening
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📍 Health check: http://localhost:${PORT}/health`);
      console.log(`📋 Consent API: http://localhost:${PORT}/api/consent`);
      console.log(`📊 Export API: http://localhost:${PORT}/api/export`);
      console.log(`📤 Upload API: http://localhost:${PORT}/api/upload`);
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();
