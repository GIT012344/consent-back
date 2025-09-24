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

// CORS configuration - Simplified and more permissive for Render
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // In production, allow all Render URLs and Netlify URLs
    if (process.env.NODE_ENV === 'production') {
      // Allow any origin that contains 'onrender.com'
      if (origin.includes('onrender.com')) {
        console.log('Allowing Render origin:', origin);
        return callback(null, true);
      }
      // Allow Netlify domains
      if (origin.includes('netlify.app') || origin.includes('netlify.com')) {
        console.log('Allowing Netlify origin:', origin);
        return callback(null, true);
      }
      // Also allow the specific CORS_ORIGIN if set
      if (process.env.CORS_ORIGIN && origin === process.env.CORS_ORIGIN) {
        return callback(null, true);
      }
    } else {
      // In development, allow localhost
      const localhostRegex = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
      if (localhostRegex.test(origin)) {
        return callback(null, true);
      }
    }
    
    console.log('CORS blocked origin:', origin);
    // Be permissive and allow anyway if uncertain
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
  exposedHeaders: ['Content-Length', 'Content-Type'],
  preflightContinue: false,
  optionsSuccessStatus: 204,
  maxAge: 86400 // Cache preflight response for 24 hours
};

app.use(cors(corsOptions));

// Additional middleware to ensure CORS headers are always set
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && (origin.includes('onrender.com') || origin.includes('netlify.app') || origin.includes('netlify.com'))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  next();
});

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

// Handle preflight requests globally
app.options('*', (req, res) => {
  const origin = req.headers.origin;
  if (origin && (origin.includes('onrender.com') || origin.includes('netlify.app') || origin.includes('netlify.com'))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, Origin, X-Requested-With');
    res.setHeader('Access-Control-Max-Age', '86400');
  }
  res.sendStatus(204);
});

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

// Global error handler - ensure CORS headers are set even on errors
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);
  
  // Ensure CORS headers are set even on error responses
  const origin = req.headers.origin;
  if (origin && (origin.includes('onrender.com') || origin.includes('netlify.app') || origin.includes('netlify.com'))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, Origin, X-Requested-With');
  }
  
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
    console.log('🔄 Running database migrations...');
    try {
      const fs = require('fs').promises;
      const path = require('path');
      const migrationDir = path.join(__dirname, 'migrations');
      const { pool } = require('./config/database');
      
      // Read all SQL files in migrations directory
      const migrationFiles = await fs.readdir(migrationDir);
      const sqlFiles = migrationFiles.filter(file => file.endsWith('.sql')).sort();
      
      for (const sqlFile of sqlFiles) {
        console.log(`📝 Running migration: ${sqlFile}`);
        const migrationPath = path.join(migrationDir, sqlFile);
        const migrationSQL = await fs.readFile(migrationPath, 'utf8');
        
        // Parse and execute SQL commands properly
        // First, execute all simple ALTER TABLE commands
        const alterCommands = migrationSQL.match(/ALTER TABLE[^;]+;/g) || [];
        for (const command of alterCommands) {
          try {
            await pool.query(command);
            console.log('✅ Executed:', command.substring(0, 60) + '...');
          } catch (cmdError) {
            if (!cmdError.message.includes('already exists') && 
                !cmdError.message.includes('does not exist')) {
              console.log('⚠️ Migration error:', cmdError.message);
            }
          }
        }
        
        // Then execute DO blocks
        const doBlocks = migrationSQL.match(/DO \$\$[\s\S]*?END \$\$;/g) || [];
        for (const doBlock of doBlocks) {
          try {
            await pool.query(doBlock);
            console.log('✅ Executed DO block successfully');
          } catch (blockError) {
            if (!blockError.message.includes('already exists')) {
              console.log('⚠️ DO block error:', blockError.message);
            }
          }
        }
        
        // Finally, execute CREATE INDEX commands
        const indexCommands = migrationSQL.match(/CREATE INDEX[^;]+;/g) || [];
        for (const command of indexCommands) {
          try {
            await pool.query(command);
            console.log('✅ Created index:', command.substring(0, 50) + '...');
          } catch (indexError) {
            if (!indexError.message.includes('already exists')) {
              console.log('⚠️ Index error:', indexError.message);
            }
          }
        }
        
        console.log(`✅ Migration ${sqlFile} completed`);
      }
      console.log('✅ All database migrations completed');
    } catch (error) {
      console.error('❌ Migration error:', error.message);
      // Don't exit - let the server continue
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
