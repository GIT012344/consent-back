const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
const { body, validationResult } = require('express-validator');

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// Authentication middleware
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        error: 'ไม่พบ token การยืนยันตัวตน' 
      });
    }
    
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Get admin user from database
    const result = await pool.query(
      'SELECT id, username, full_name, role FROM admin_users WHERE id = $1 AND is_active = true',
      [decoded.userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ 
        success: false, 
        error: 'ผู้ใช้งานไม่มีสิทธิ์เข้าถึง' 
      });
    }
    
    req.user = result.rows[0];
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false, 
        error: 'Token ไม่ถูกต้อง' 
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        error: 'Token หมดอายุ' 
      });
    }
    return res.status(500).json({ 
      success: false, 
      error: 'เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์' 
      });
  }
};

// Log audit trail
const logAudit = async (action, entityType, entityId, adminId, ipAddress, details = {}) => {
  try {
    await pool.query(
      `INSERT INTO audit_logs (action, entity_type, entity_id, admin_id, ip_address, details)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [action, entityType, entityId, adminId, ipAddress, JSON.stringify(details)]
    );
  } catch (error) {
    console.error('Error logging audit:', error);
  }
};

// Admin login
router.post('/login', [
  body('username').notEmpty().withMessage('กรุณาระบุชื่อผู้ใช้'),
  body('password').notEmpty().withMessage('กรุณาระบุรหัสผ่าน')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }
    
    const { username, password } = req.body;
    
    // Get admin user
    const result = await pool.query(
      'SELECT * FROM admin_users WHERE username = $1 AND is_active = true',
      [username]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ 
        success: false, 
        error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' 
      });
    }
    
    const admin = result.rows[0];
    
    // Verify password
    const isPasswordValid = await bcrypt.compare(password, admin.password_hash);
    
    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false, 
        error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' 
      });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: admin.id, 
        username: admin.username,
        role: admin.role 
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    
    // Update last login
    await pool.query(
      'UPDATE admin_users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [admin.id]
    );
    
    // Log audit
    await logAudit('admin_login', 'admin_users', admin.id, admin.id, req.ip, {
      username: admin.username
    });
    
    res.json({
      success: true,
      data: {
        token,
        user: {
          id: admin.id,
          username: admin.username,
          fullName: admin.full_name,
          role: admin.role
        }
      }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ' 
    });
  }
});

// Get current admin user
router.get('/me', authMiddleware, async (req, res) => {
  res.json({
    success: true,
    data: req.user
  });
});

// Change password
router.post('/change-password', authMiddleware, [
  body('currentPassword').notEmpty().withMessage('กรุณาระบุรหัสผ่านปัจจุบัน'),
  body('newPassword').isLength({ min: 6 }).withMessage('รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }
    
    const { currentPassword, newPassword } = req.body;
    
    // Get current password hash
    const result = await pool.query(
      'SELECT password_hash FROM admin_users WHERE id = $1',
      [req.user.id]
    );
    
    const isPasswordValid = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
    
    if (!isPasswordValid) {
      return res.status(400).json({ 
        success: false, 
        error: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' 
      });
    }
    
    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    
    // Update password
    await pool.query(
      'UPDATE admin_users SET password_hash = $1 WHERE id = $2',
      [newPasswordHash, req.user.id]
    );
    
    // Log audit
    await logAudit('password_changed', 'admin_users', req.user.id, req.user.id, req.ip);
    
    res.json({
      success: true,
      message: 'เปลี่ยนรหัสผ่านเรียบร้อยแล้ว'
    });
    
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน' 
    });
  }
});

// Get dashboard statistics
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const client = await pool.connect();
    
    try {
      // Get total consents
      const totalResult = await client.query(
        'SELECT COUNT(*) as total FROM consents'
      );
      
      // Get today's consents
      const todayResult = await client.query(
        `SELECT COUNT(*) as total FROM consents 
         WHERE DATE(consent_date) = CURRENT_DATE`
      );
      
      // Get active consents
      const activeResult = await client.query(
        `SELECT COUNT(*) as total FROM consents 
         WHERE status = 'active'`
      );
      
      // Get withdrawn consents
      const withdrawnResult = await client.query(
        `SELECT COUNT(*) as total FROM consents 
         WHERE status = 'withdrawn'`
      );
      
      // Get monthly trend (last 12 months)
      const trendResult = await client.query(
        `SELECT 
          TO_CHAR(consent_date, 'YYYY-MM') as month,
          COUNT(*) as count
         FROM consents
         WHERE consent_date >= CURRENT_DATE - INTERVAL '12 months'
         GROUP BY TO_CHAR(consent_date, 'YYYY-MM')
         ORDER BY month`
      );
      
      // Get consents by version
      const versionResult = await client.query(
        `SELECT 
          cv.version,
          cv.language,
          COUNT(c.id) as count
         FROM consent_versions cv
         LEFT JOIN consents c ON c.consent_version_id = cv.id
         GROUP BY cv.id, cv.version, cv.language
         ORDER BY cv.version`
      );
      
      res.json({
        success: true,
        data: {
          totalConsents: parseInt(totalResult.rows[0].total),
          todayConsents: parseInt(todayResult.rows[0].total),
          activeConsents: parseInt(activeResult.rows[0].total),
          withdrawnConsents: parseInt(withdrawnResult.rows[0].total),
          monthlyTrend: trendResult.rows,
          consentsByVersion: versionResult.rows
        }
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'เกิดข้อผิดพลาดในการดึงข้อมูลสถิติ' 
    });
  }
});

// Get consent list with pagination
router.get('/consents', authMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const status = req.query.status || '';
    
    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramCount = 0;
    
    if (search) {
      paramCount++;
      whereClause += ` AND (u.full_name ILIKE $${paramCount} OR u.id_passport ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }
    
    if (status) {
      paramCount++;
      whereClause += ` AND c.status = $${paramCount}`;
      params.push(status);
    }
    
    // Add limit and offset
    paramCount++;
    params.push(limit);
    paramCount++;
    params.push(offset);
    
    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM consents c
      JOIN users u ON c.user_id = u.id
      ${whereClause}
    `;
    
    const countResult = await pool.query(
      countQuery,
      params.slice(0, -2) // Exclude limit and offset for count
    );
    
    // Get data
    const dataQuery = `
      SELECT 
        c.id,
        c.consent_given,
        c.consent_date,
        c.status,
        c.ip_address,
        u.title,
        u.full_name,
        u.id_passport,
        u.email,
        u.phone,
        cv.version as consent_version,
        cv.language
      FROM consents c
      JOIN users u ON c.user_id = u.id
      LEFT JOIN consent_versions cv ON c.consent_version_id = cv.id
      ${whereClause}
      ORDER BY c.consent_date DESC
      LIMIT $${paramCount - 1} OFFSET $${paramCount}
    `;
    
    const dataResult = await pool.query(dataQuery, params);
    
    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);
    
    res.json({
      success: true,
      data: {
        items: dataResult.rows,
        total,
        page,
        totalPages,
        limit
      }
    });
    
  } catch (error) {
    console.error('Get consents error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'เกิดข้อผิดพลาดในการดึงข้อมูล' 
    });
  }
});

// Withdraw consent
router.put('/consents/:id/withdraw', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      `UPDATE consents 
       SET status = 'withdrawn', 
           withdrawn_date = CURRENT_TIMESTAMP 
       WHERE id = $1
       RETURNING *`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'ไม่พบข้อมูลการให้ความยินยอม' 
      });
    }
    
    // Log audit
    await logAudit('consent_withdrawn', 'consents', id, req.user.id, req.ip);
    
    res.json({
      success: true,
      message: 'ถอนความยินยอมเรียบร้อยแล้ว'
    });
    
  } catch (error) {
    console.error('Withdraw consent error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'เกิดข้อผิดพลาดในการถอนความยินยอม' 
    });
  }
});

module.exports = { router, authMiddleware, logAudit };
