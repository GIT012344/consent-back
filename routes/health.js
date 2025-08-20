const express = require('express');
const { pool } = require('../config/database');
const os = require('os');
const router = express.Router();

// GET /api/health - Basic health check
router.get('/', async (req, res) => {
  try {
    // Check database connection
    const dbResult = await pool.query('SELECT NOW() as time');
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: {
        connected: true,
        time: dbResult.rows[0].time
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// GET /api/health/detailed - Detailed health check
router.get('/detailed', async (req, res) => {
  try {
    // Check database connection and get stats
    const dbStats = await pool.query(
      `SELECT 
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM consents) as total_consents,
        (SELECT COUNT(*) FROM consent_versions) as total_versions,
        (SELECT COUNT(*) FROM admin_users) as total_admins`
    );
    
    // Get system metrics
    const memUsage = process.memoryUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      system: {
        platform: os.platform(),
        architecture: os.arch(),
        cpus: os.cpus().length,
        hostname: os.hostname(),
        uptime: process.uptime(),
        nodeVersion: process.version,
        memory: {
          total: `${(totalMem / 1024 / 1024 / 1024).toFixed(2)} GB`,
          free: `${(freeMem / 1024 / 1024 / 1024).toFixed(2)} GB`,
          used: `${((totalMem - freeMem) / 1024 / 1024 / 1024).toFixed(2)} GB`,
          usage: `${((1 - freeMem / totalMem) * 100).toFixed(2)}%`
        },
        process: {
          rss: `${(memUsage.rss / 1024 / 1024).toFixed(2)} MB`,
          heapTotal: `${(memUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
          heapUsed: `${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
          external: `${(memUsage.external / 1024 / 1024).toFixed(2)} MB`
        }
      },
      database: {
        connected: true,
        stats: {
          totalUsers: parseInt(dbStats.rows[0].total_users),
          totalConsents: parseInt(dbStats.rows[0].total_consents),
          totalVersions: parseInt(dbStats.rows[0].total_versions),
          totalAdmins: parseInt(dbStats.rows[0].total_admins)
        }
      },
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
      database: {
        connected: false
      }
    });
  }
});

// GET /api/health/ready - Readiness check for deployments
router.get('/ready', async (req, res) => {
  try {
    // Check if database is accessible
    await pool.query('SELECT 1');
    
    // Check if critical tables exist
    const tables = ['users', 'consents', 'consent_versions', 'admin_users'];
    for (const table of tables) {
      await pool.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = $1
        )`,
        [table]
      );
    }
    
    res.json({
      status: 'ready',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// GET /api/health/live - Liveness check for deployments
router.get('/live', (req, res) => {
  res.json({
    status: 'alive',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
