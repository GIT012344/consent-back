const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { authMiddleware, logAudit } = require('./admin');
const { 
  validateIDOrPassport, 
  validateEmail, 
  validateThaiPhone,
  sanitizeInput,
  generateReferenceNumber 
} = require('../utils/validation');

const router = express.Router();

// Validation for initial registration
const validateInitialRegistration = [
  body('title')
    .trim()
    .isIn(['นาย', 'นาง', 'นางสาว', 'Mr.', 'Mrs.', 'Miss', 'Ms.'])
    .withMessage('Invalid title'),
  
  body('fullName')
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Full name must be between 2 and 255 characters')
];

// Validation for full consent submission
const validateFullConsent = [
  body('title')
    .trim()
    .isIn(['นาย', 'นาง', 'นางสาว', 'Mr.', 'Mrs.', 'Miss', 'Ms.'])
    .withMessage('Invalid title'),
  
  body('fullName')
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Full name must be between 2 and 255 characters'),
  
  body('idPassport')
    .trim()
    .custom(validateIDOrPassport)
    .withMessage('Invalid ID or Passport number'),
  
  body('email')
    .optional()
    .trim()
    .custom(validateEmail)
    .withMessage('Invalid email format'),
  
  body('phone')
    .optional()
    .trim()
    .custom(validateThaiPhone)
    .withMessage('Invalid Thai phone number'),
  
  body('consentGiven')
    .isBoolean()
    .withMessage('Consent given must be true or false'),
  
  body('consentVersionId')
    .optional()
    .isInt()
    .withMessage('Consent version ID must be a number')
];

// Helper to get client IP
const getClientIP = (req) => {
  return req.headers['x-forwarded-for'] || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress ||
         req.ip || 
         '127.0.0.1';
};

// POST /api/consent/initial - Initial registration (no ID required)
router.post('/initial', validateInitialRegistration, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { title, fullName } = req.body;

    res.json({
      success: true,
      data: {
        userData: {
          title: sanitizeInput(title),
          fullName: sanitizeInput(fullName)
        }
      }
    });

  } catch (error) {
    console.error('Initial registration error:', error);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล'
    });
  }
});

// POST /api/consent/submit - Full consent submission
router.post('/submit', validateFullConsent, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    await client.query('BEGIN');

    const {
      title,
      fullName,
      idPassport,
      email,
      phone,
      consentGiven,
      consentVersionId,
      consentVersion
    } = req.body;

    const ipAddress = getClientIP(req);
    const userAgent = req.headers['user-agent'] || 'Unknown';

    // 1. Insert or update user
    let userId;
    const existingUser = await client.query(
      'SELECT id FROM users WHERE id_passport = $1',
      [idPassport]
    );

    if (existingUser.rows.length > 0) {
      // Update existing user
      userId = existingUser.rows[0].id;
      await client.query(
        `UPDATE users 
         SET title = $1, full_name = $2, email = $3, phone = $4, updated_at = CURRENT_TIMESTAMP
         WHERE id = $5`,
        [title, fullName, email, phone, userId]
      );
    } else {
      // Insert new user
      const userResult = await client.query(
        `INSERT INTO users (title, full_name, id_passport, email, phone)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [title, fullName, idPassport, email, phone]
      );
      userId = userResult.rows[0].id;
    }

    // 2. Get consent version ID if not provided
    let versionId = consentVersionId;
    if (!versionId) {
      // Check for targeted version first
      const targetedVersion = await client.query(
        `SELECT consent_version_id 
         FROM consent_version_targeting 
         WHERE id_passport = $1 
           AND is_active = true 
           AND (start_date IS NULL OR start_date <= CURRENT_DATE)
           AND (end_date IS NULL OR end_date >= CURRENT_DATE)
         ORDER BY created_at DESC
         LIMIT 1`,
        [idPassport]
      );

      if (targetedVersion.rows.length > 0) {
        versionId = targetedVersion.rows[0].consent_version_id;
      } else {
        // Get active consent version
        const activeVersion = await client.query(
          `SELECT id FROM consent_versions 
           WHERE is_active = true 
           ORDER BY created_at DESC 
           LIMIT 1`
        );
        
        if (activeVersion.rows.length > 0) {
          versionId = activeVersion.rows[0].id;
        } else {
          throw new Error('No active consent version found');
        }
      }
    }

    // 3. Insert consent record
    const consentResult = await client.query(
      `INSERT INTO consents (user_id, consent_version_id, consent_given, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [userId, versionId, consentGiven, ipAddress, userAgent]
    );

    const consentId = consentResult.rows[0].id;

    // 4. Also insert into consent_records for backward compatibility
    await client.query(
      `INSERT INTO consent_records 
       (title, name_surname, id_passport, ip_address, browser, consent_version)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id_passport) DO UPDATE
       SET updated_at = CURRENT_TIMESTAMP`,
      [title, fullName, idPassport, ipAddress, userAgent, consentVersion || '1.0']
    );

    await client.query('COMMIT');

    // Generate reference number
    const referenceNumber = generateReferenceNumber();

    // Log audit
    await logAudit('consent_submitted', 'consents', consentId, null, ipAddress, {
      userId,
      idPassport: idPassport.slice(0, 4) + '***'
    });

    res.status(201).json({
      success: true,
      message: 'บันทึกข้อมูลสำเร็จ',
      data: {
        consentId,
        referenceNumber
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Consent submission error:', error);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล'
    });
  } finally {
    client.release();
  }
});

// GET /api/consent/check/:idPassport - Check consent status
router.get('/check/:idPassport', async (req, res) => {
  try {
    const { idPassport } = req.params;

    if (!validateIDOrPassport(idPassport)) {
      return res.status(400).json({
        success: false,
        error: 'รหัสบัตรประชาชนหรือพาสปอร์ตไม่ถูกต้อง'
      });
    }

    const result = await pool.query(
      `SELECT 
        u.full_name,
        u.id_passport,
        u.email,
        u.phone,
        c.consent_given,
        c.consent_date,
        c.status,
        cv.version as consent_version
       FROM users u
       JOIN consents c ON u.id = c.user_id
       JOIN consent_versions cv ON c.consent_version_id = cv.id
       WHERE u.id_passport = $1
       ORDER BY c.consent_date DESC
       LIMIT 1`,
      [idPassport]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบข้อมูลการให้ความยินยอม'
      });
    }

    const data = result.rows[0];

    res.json({
      success: true,
      data: {
        fullName: data.full_name,
        idPassport: data.id_passport,
        email: data.email,
        phone: data.phone,
        consentGiven: data.consent_given,
        consentDate: data.consent_date,
        consentVersion: data.consent_version,
        status: data.status
      }
    });

  } catch (error) {
    console.error('Check consent error:', error);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการตรวจสอบข้อมูล'
    });
  }
});

// GET /api/consent/active-version - Get active consent version
router.get('/active-version', async (req, res) => {
  try {
    const language = req.query.language || 'th';

    const result = await pool.query(
      `SELECT id, version, language, description
       FROM consent_versions
       WHERE is_active = true AND language = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [language]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบเวอร์ชันที่ใช้งานอยู่'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Get active version error:', error);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการดึงข้อมูล'
    });
  }
});

// GET /api/consent/targeted-version/:idPassport - Get targeted version
router.get('/targeted-version/:idPassport', async (req, res) => {
  try {
    const { idPassport } = req.params;
    const language = req.query.language || 'th';

    if (!validateIDOrPassport(idPassport)) {
      return res.status(400).json({
        success: false,
        error: 'รหัสบัตรประชาชนหรือพาสปอร์ตไม่ถูกต้อง'
      });
    }

    const result = await pool.query(
      `SELECT cv.id, cv.version, cv.language, cv.description
       FROM consent_version_targeting cvt
       JOIN consent_versions cv ON cvt.consent_version_id = cv.id
       WHERE cvt.id_passport = $1
         AND cv.language = $2
         AND cvt.is_active = true
         AND (cvt.start_date IS NULL OR cvt.start_date <= CURRENT_DATE)
         AND (cvt.end_date IS NULL OR cvt.end_date >= CURRENT_DATE)
       ORDER BY cvt.created_at DESC
       LIMIT 1`,
      [idPassport, language]
    );

    if (result.rows.length === 0) {
      // Return active version if no targeted version
      const activeVersion = await pool.query(
        `SELECT id, version, language, description
         FROM consent_versions
         WHERE is_active = true AND language = $1
         ORDER BY created_at DESC
         LIMIT 1`,
        [language]
      );

      if (activeVersion.rows.length > 0) {
        return res.json({
          success: true,
          data: activeVersion.rows[0]
        });
      }

      return res.status(404).json({
        success: false,
        error: 'ไม่พบเวอร์ชันที่เหมาะสม'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Get targeted version error:', error);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการดึงข้อมูล'
    });
  }
});

// GET /api/consent/list - Admin endpoint to list consents
router.get('/list', authMiddleware, async (req, res) => {
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
      params.slice(0, -2) // Exclude limit and offset
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
    console.error('Get consent list error:', error);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการดึงข้อมูล'
    });
  }
});

// GET /api/consent/stats - Get statistics
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

module.exports = router;
