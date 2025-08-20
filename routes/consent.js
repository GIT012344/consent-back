const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');

const router = express.Router();

// Validation middleware
const validateConsentSubmission = [
  body('title')
    .trim()
    .isIn(['นาย', 'นาง', 'นางสาว', 'Mr.', 'Mrs.', 'Miss', 'Ms.'])
    .withMessage('Invalid title'),
  
  body('nameSurname')
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Name-Surname must be between 2 and 255 characters'),
  
  body('idPassport')
    .trim()
    .isLength({ min: 8, max: 50 })
    .withMessage('ID/Passport must be between 8 and 50 characters'),
  
  body('email')
    .optional()
    .isEmail()
    .withMessage('Invalid email format'),
  
  body('phone')
    .optional()
    .matches(/^[0-9]{9,10}$/)
    .withMessage('Phone must be 9-10 digits'),
  
  body('language')
    .optional()
    .isIn(['th', 'en'])
    .withMessage('Language must be th or en'),
  
  body('consentType')
    .optional()
    .isIn(['customer', 'employee', 'partner'])
    .withMessage('Invalid consent type'),
  
  body('userType')
    .optional()
    .isIn(['customer', 'employee', 'partner'])
    .withMessage('Invalid user type'),
  
  body('consentVersionId')
    .optional()
    .isInt()
    .withMessage('Consent version ID must be a number'),
  
  body('consentVersion')
    .optional()
    .isString()
    .withMessage('Consent version must be a string')
];

// Helper function to get client IP
const getClientIP = (req) => {
  return req.headers['x-forwarded-for'] || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress ||
         (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
         req.ip;
};

// Helper function to get browser info
const getBrowserInfo = (req) => {
  return req.headers['user-agent'] || 'Unknown';
};

// POST /api/consent/submit - Submit new consent
router.post('/submit', validateConsentSubmission, async (req, res) => {
  try {
    // Check validation results
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { title, nameSurname, idPassport, email, phone, language = 'th', consentType, userType = 'customer', consentVersionId, consentVersion } = req.body;

    const ipAddress = getClientIP(req);
    const browser = getBrowserInfo(req);
    const finalConsentVersion = consentVersion || '1.0';

    // Check if consent already exists for this ID/Passport with the same version
    const existingConsent = await pool.query(
      `SELECT id, created_date, consent_version, title, name_surname, consent_type, consent_language 
       FROM consent_records 
       WHERE id_passport = $1 AND is_active = TRUE 
       ORDER BY created_date DESC 
       LIMIT 1`,
      [idPassport]
    );

    if (existingConsent.rows.length > 0) {
      const existing = existingConsent.rows[0];
      
      // Check if trying to submit same version
      if (existing.consent_version === finalConsentVersion) {
        return res.status(409).json({
          success: false,
          message: 'Consent already exists for this ID/Passport number and version',
          existingRecord: {
            id: existing.id,
            title: existing.title,
            name_surname: existing.name_surname,
            created_date: existing.created_date,
            consent_type: existing.consent_type,
            consent_language: existing.consent_language,
            consent_version: existing.consent_version
          }
        });
      }
      
      // Different version - allow re-consent but deactivate old record
      await pool.query(
        'UPDATE consent_records SET is_active = FALSE WHERE id_passport = $1 AND is_active = TRUE',
        [idPassport]
      );
    }

    // Insert new consent record
    const insertQuery = `
      INSERT INTO consent_records 
      (title, name_surname, id_passport, email, phone, ip_address, browser_info, 
       user_type, consent_language, consent_version, consent_version_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id, uid
    `;

    const result = await pool.query(insertQuery, [
      title,
      nameSurname,
      idPassport,
      email,
      phone,
      ipAddress,
      browser,
      userType || 'customer',  // Use userType from request
      language,
      finalConsentVersion,
      consentVersionId || null
    ]);
    
    // Also insert into consent_history for tracking all versions
    const historyQuery = `
      INSERT INTO consent_history 
      (id_passport, title, name_surname, consent_version, consent_version_id, 
       consent_type, user_type, consent_language, is_active, ip_address, browser, action)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `;
    
    await pool.query(historyQuery, [
      idPassport,
      title,
      nameSurname,
      finalConsentVersion,
      consentVersionId || null,
      userType || 'customer',  // as consent_type
      userType || 'customer',  // as user_type
      language,
      true,
      ipAddress,
      browser,
      'consent_given'
    ]);

    // Get the inserted record
    const newRecord = await pool.query(
      'SELECT * FROM consent_records WHERE id = $1',
      [result.rows[0].id]
    );

    res.status(201).json({
      success: true,
      message: 'Consent submitted successfully',
      data: {
        id: result.rows[0].id,
        submissionId: uuidv4(),
        record: newRecord.rows[0]
      }
    });

  } catch (error) {
    console.error('Error submitting consent:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
});

// GET /api/consent/check/:idPassport - Check if consent exists
router.get('/check/:idPassport', async (req, res) => {
  try {
    const { idPassport } = req.params;

    if (!idPassport || idPassport.trim().length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Invalid ID/Passport number'
      });
    }

    const records = await pool.query(
      'SELECT id, title, name_surname, created_date, consent_language, consent_type FROM consent_records WHERE id_passport = $1 AND is_active = TRUE',
      [idPassport.trim()]
    );

    if (records.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No consent record found for this ID/Passport number'
      });
    }

    res.json({
      success: true,
      message: 'Consent record found',
      data: records.rows[0]
    });

  } catch (error) {
    console.error('Error checking consent:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
});

// GET /api/consent/list - Get all consent records (with pagination)
router.get('/list', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;
    
    const searchTerm = req.query.search || '';
    const consentType = req.query.type || '';
    const language = req.query.language || '';
    const startDate = req.query.startDate || '';
    const endDate = req.query.endDate || '';

    // Build WHERE clause
    let whereConditions = ['is_active = TRUE'];
    let queryParams = [];

    let paramIndex = 1;
    if (searchTerm) {
      whereConditions.push(`(name_surname LIKE $${paramIndex} OR id_passport LIKE $${paramIndex + 1})`);
      queryParams.push(`%${searchTerm}%`, `%${searchTerm}%`);
      paramIndex += 2;
    }

    if (consentType) {
      whereConditions.push(`consent_type = $${paramIndex}`);
      queryParams.push(consentType);
      paramIndex++;
    }

    if (language) {
      whereConditions.push(`consent_language = $${paramIndex}`);
      queryParams.push(language);
      paramIndex++;
    }

    if (startDate) {
      whereConditions.push(`DATE(created_date) >= $${paramIndex}`);
      queryParams.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      whereConditions.push(`DATE(created_date) <= $${paramIndex}`);
      queryParams.push(endDate);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM consent_records ${whereClause}`;
    const countResult = await pool.query(countQuery, queryParams);
    const totalRecords = parseInt(countResult.rows[0].total);

    // Get records with pagination
    const dataQuery = `
      SELECT id, title, name_surname, id_passport, created_date, created_time, 
             ip_address, consent_type, consent_language, consent_version
      FROM consent_records 
      ${whereClause}
      ORDER BY created_date DESC 
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    const records = await pool.query(dataQuery, [...queryParams, limit, offset]);

    res.json({
      success: true,
      data: {
        records: records.rows,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalRecords / limit),
          totalRecords,
          recordsPerPage: limit,
          hasNextPage: page < Math.ceil(totalRecords / limit),
          hasPrevPage: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Error fetching consent list:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
});

// GET /api/consent/stats - Get consent statistics
router.get('/stats', async (req, res) => {
  try {
    // Total consents
    const totalResult = await pool.query(
      'SELECT COUNT(*) as total FROM consent_records WHERE is_active = TRUE'
    );

    // Consents by type
    const typeResult = await pool.query(
      'SELECT consent_type, COUNT(*) as count FROM consent_records WHERE is_active = TRUE GROUP BY consent_type'
    );

    // Consents by language
    const languageResult = await pool.query(
      'SELECT consent_language, COUNT(*) as count FROM consent_records WHERE is_active = TRUE GROUP BY consent_language'
    );

    // Consents by date (last 30 days)
    const dateResult = await pool.query(`
      SELECT DATE(created_date) as date, COUNT(*) as count 
      FROM consent_records 
      WHERE is_active = TRUE AND created_date >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_date) 
      ORDER BY date DESC
    `);

    res.json({
      success: true,
      data: {
        total: parseInt(totalResult.rows[0].total),
        byType: typeResult.rows,
        byLanguage: languageResult.rows,
        byDate: dateResult.rows
      }
    });

  } catch (error) {
    console.error('Error fetching consent stats:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
});

// GET /api/consent/targeted-version/:idPassport - Get targeted consent version for a user
router.get('/targeted-version/:idPassport', async (req, res) => {
  try {
    const { idPassport } = req.params;
    
    // First check if there's a specific targeting rule for this user
    const targetingResult = await pool.query(`
      SELECT cv.* 
      FROM version_targeting vt
      JOIN consent_versions cv ON vt.consent_version_id = cv.id
      WHERE vt.id_passport = $1 
        AND vt.is_active = TRUE
        AND (vt.start_date IS NULL OR vt.start_date <= CURRENT_DATE)
        AND (vt.end_date IS NULL OR vt.end_date >= CURRENT_DATE)
      ORDER BY vt.created_at DESC
      LIMIT 1
    `, [idPassport]);

    if (targetingResult.rows.length > 0) {
      return res.json({
        success: true,
        data: targetingResult.rows[0]
      });
    }

    // If no specific targeting, return the active version
    const activeResult = await pool.query(`
      SELECT * FROM consent_versions 
      WHERE is_active = TRUE 
      ORDER BY created_at DESC 
      LIMIT 1
    `);

    if (activeResult.rows.length > 0) {
      return res.json({
        success: true,
        data: activeResult.rows[0]
      });
    }

    // Default fallback
    res.json({
      success: true,
      data: {
        id: 1,
        version: '1.0',
        language: 'th',
        is_active: true
      }
    });

  } catch (error) {
    console.error('Error fetching targeted version:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching targeted version',
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
});

// GET /api/consent/active-version - Get currently active consent version
router.get('/active-version', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM consent_versions 
      WHERE is_active = TRUE 
      ORDER BY created_at DESC 
      LIMIT 1
    `);

    if (result.rows.length > 0) {
      return res.json({
        success: true,
        data: result.rows[0]
      });
    }

    // Default fallback
    res.json({
      success: true,
      data: {
        id: 1,
        version: '1.0', 
        language: 'th',
        is_active: true
      }
    });

  } catch (error) {
    console.error('Error fetching active version:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching active version',
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
});

// Get active version by user type and language
router.get('/active-version/:userType/:language', async (req, res) => {
  try {
    const { userType, language } = req.params;
    
    // Query for version based on userType and language
    const query = `
      SELECT * FROM consent_versions 
      WHERE is_active = TRUE 
        AND user_type = $1 
        AND language = $2
      ORDER BY created_at DESC
      LIMIT 1
    `;
    
    let result = await pool.query(query, [userType, language]);
    
    // If no specific version found, try to get default version for the userType
    if (result.rows.length === 0) {
      const defaultQuery = `
        SELECT * FROM consent_versions 
        WHERE is_active = TRUE 
          AND user_type = $1
        ORDER BY created_at DESC
        LIMIT 1
      `;
      result = await pool.query(defaultQuery, [userType]);
    }
    
    // If still no version, get any active version
    if (result.rows.length === 0) {
      const fallbackQuery = `
        SELECT * FROM consent_versions 
        WHERE is_active = TRUE
        ORDER BY created_at DESC
        LIMIT 1
      `;
      result = await pool.query(fallbackQuery);
    }
    
    if (result.rows.length > 0) {
      return res.json({
        success: true,
        data: result.rows[0]
      });
    }
    
    return res.json({
      success: false,
      message: 'No active version found'
    });
    
  } catch (error) {
    console.error('Error fetching targeted version:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch version'
    });
  }
});

// Get consent history for an ID/Passport
router.get('/history/:idPassport', async (req, res) => {
  try {
    const { idPassport } = req.params;
    
    // Get all consent history for this ID/Passport
    const historyQuery = `
      SELECT 
        h.*,
        cv.version_name,
        cv.description as version_description,
        cv.file_url
      FROM consent_history h
      LEFT JOIN consent_versions cv ON h.consent_version_id = cv.id
      WHERE h.id_passport = $1
      ORDER BY h.created_date DESC, h.created_time DESC
    `;
    
    const history = await pool.query(historyQuery, [idPassport]);
    
    // Get current active consent
    const activeQuery = `
      SELECT * FROM consent_records 
      WHERE id_passport = $1 AND is_active = TRUE
      LIMIT 1
    `;
    
    const active = await pool.query(activeQuery, [idPassport]);
    
    return res.json({
      success: true,
      data: {
        history: history.rows,
        activeConsent: active.rows[0] || null,
        totalVersions: history.rows.length
      }
    });
    
  } catch (error) {
    console.error('Error fetching consent history:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch consent history'
    });
  }
});

// GET /api/consent/targeting-rules - Get targeting rules for all user types
router.get('/targeting-rules', async (req, res) => {
  try {
    const query = `
      SELECT 
        cv.id,
        cv.version,
        cv.description,
        cv.user_type,
        cv.language,
        cv.is_active,
        cv.usage_count,
        cv.created_at,
        cv.updated_at,
        COUNT(cr.id) as total_consents
      FROM consent_versions cv
      LEFT JOIN consent_records cr ON cr.consent_version_id = cv.id
      WHERE cv.is_active = true
      GROUP BY cv.id
      ORDER BY cv.user_type, cv.language, cv.created_at DESC
    `;
    
    const result = await pool.query(query);
    
    // Group by user type
    const rulesByUserType = {
      customer: [],
      employee: [],
      partner: []
    };
    
    result.rows.forEach(row => {
      if (rulesByUserType[row.user_type]) {
        rulesByUserType[row.user_type].push(row);
      }
    });
    
    res.json({
      success: true,
      data: rulesByUserType
    });
    
  } catch (error) {
    console.error('Error fetching targeting rules:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch targeting rules'
    });
  }
});

// POST /api/consent/targeting-rule - Create or update targeting rule
router.post('/targeting-rule', async (req, res) => {
  try {
    const { userType, versionId } = req.body;
    
    if (!userType || !versionId) {
      return res.status(400).json({
        success: false,
        message: 'userType and versionId are required'
      });
    }
    
    // First, deactivate all versions for this user type
    await pool.query(
      'UPDATE consent_versions SET is_active = false WHERE user_type = $1',
      [userType]
    );
    
    // Then activate the selected version
    const result = await pool.query(
      'UPDATE consent_versions SET is_active = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND user_type = $2 RETURNING *',
      [versionId, userType]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Version not found for this user type'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0],
      message: 'Targeting rule updated successfully'
    });
    
  } catch (error) {
    console.error('Error updating targeting rule:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update targeting rule'
    });
  }
});

module.exports = router;
