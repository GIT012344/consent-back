const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { authMiddleware, logAudit } = require('./admin');
const { validateIDOrPassport } = require('../utils/validation');

const router = express.Router();

// Validation for version targeting
const validateVersionTargeting = [
  body('idPassport')
    .trim()
    .custom(validateIDOrPassport)
    .withMessage('Invalid ID or Passport number'),
  
  body('consentVersionId')
    .isInt()
    .withMessage('Consent version ID must be a number'),
  
  body('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid date'),
  
  body('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid date')
    .custom((value, { req }) => {
      if (value && req.body.startDate) {
        return new Date(value) >= new Date(req.body.startDate);
      }
      return true;
    })
    .withMessage('End date must be after start date')
];

// POST /api/consent/version-targeting - Create version targeting
router.post('/', authMiddleware, validateVersionTargeting, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { idPassport, consentVersionId, startDate, endDate } = req.body;

    // Check if consent version exists
    const versionCheck = await pool.query(
      'SELECT id, version FROM consent_versions WHERE id = $1',
      [consentVersionId]
    );

    if (versionCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบเวอร์ชันที่ระบุ'
      });
    }

    // Check for existing active targeting for this ID
    const existingCheck = await pool.query(
      `SELECT id FROM consent_version_targeting 
       WHERE id_passport = $1 AND is_active = true`,
      [idPassport]
    );

    if (existingCheck.rows.length > 0) {
      // Deactivate existing targeting
      await pool.query(
        'UPDATE consent_version_targeting SET is_active = false WHERE id_passport = $1',
        [idPassport]
      );
    }

    // Insert new targeting
    const result = await pool.query(
      `INSERT INTO consent_version_targeting 
       (id_passport, consent_version_id, start_date, end_date, created_by, is_active)
       VALUES ($1, $2, $3, $4, $5, true)
       RETURNING id`,
      [
        idPassport,
        consentVersionId,
        startDate || null,
        endDate || null,
        req.user.username
      ]
    );

    // Log audit
    await logAudit('version_targeting_created', 'consent_version_targeting', result.rows[0].id, req.user.id, req.ip, {
      idPassport: idPassport.slice(0, 4) + '***',
      version: versionCheck.rows[0].version
    });

    res.status(201).json({
      success: true,
      data: {
        id: result.rows[0].id,
        message: 'กำหนดเป้าหมายเรียบร้อย'
      }
    });

  } catch (error) {
    console.error('Create version targeting error:', error);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการกำหนดเป้าหมาย'
    });
  }
});

// GET /api/consent/version-targeting - List all version targeting
router.get('/', authMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';

    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramCount = 0;

    if (search) {
      paramCount++;
      whereClause += ` AND cvt.id_passport ILIKE $${paramCount}`;
      params.push(`%${search}%`);
    }

    // Add limit and offset
    paramCount++;
    params.push(limit);
    paramCount++;
    params.push(offset);

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM consent_version_targeting cvt
      ${whereClause}
    `;

    const countResult = await pool.query(
      countQuery,
      params.slice(0, -2) // Exclude limit and offset
    );

    // Get data
    const dataQuery = `
      SELECT 
        cvt.id,
        cvt.id_passport,
        cvt.start_date,
        cvt.end_date,
        cvt.is_active,
        cvt.created_at,
        cvt.created_by,
        cv.version as consent_version,
        cv.language,
        cv.description
      FROM consent_version_targeting cvt
      JOIN consent_versions cv ON cvt.consent_version_id = cv.id
      ${whereClause}
      ORDER BY cvt.created_at DESC
      LIMIT $${paramCount - 1} OFFSET $${paramCount}
    `;

    const dataResult = await pool.query(dataQuery, params);

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: dataResult.rows.map(row => ({
        id: row.id,
        idPassport: row.id_passport,
        consentVersion: row.consent_version,
        language: row.language,
        description: row.description,
        startDate: row.start_date,
        endDate: row.end_date,
        isActive: row.is_active,
        createdAt: row.created_at,
        createdBy: row.created_by
      })),
      pagination: {
        page,
        totalPages,
        total,
        limit
      }
    });

  } catch (error) {
    console.error('List version targeting error:', error);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการดึงข้อมูล'
    });
  }
});

// PUT /api/consent/version-targeting/:id/toggle - Toggle active status
router.put('/:id/toggle', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    // Get current status
    const current = await pool.query(
      'SELECT is_active, id_passport FROM consent_version_targeting WHERE id = $1',
      [id]
    );

    if (current.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบข้อมูลการกำหนดเป้าหมาย'
      });
    }

    const newStatus = !current.rows[0].is_active;

    // If activating, deactivate others for the same ID
    if (newStatus) {
      await pool.query(
        'UPDATE consent_version_targeting SET is_active = false WHERE id_passport = $1 AND id != $2',
        [current.rows[0].id_passport, id]
      );
    }

    // Update status
    await pool.query(
      'UPDATE consent_version_targeting SET is_active = $1 WHERE id = $2',
      [newStatus, id]
    );

    // Log audit
    await logAudit('version_targeting_toggled', 'consent_version_targeting', id, req.user.id, req.ip, {
      newStatus
    });

    res.json({
      success: true,
      message: 'อัพเดตสถานะเรียบร้อย',
      data: {
        isActive: newStatus
      }
    });

  } catch (error) {
    console.error('Toggle version targeting error:', error);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการอัพเดตสถานะ'
    });
  }
});

// DELETE /api/consent/version-targeting/:id - Delete version targeting
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM consent_version_targeting WHERE id = $1 RETURNING id_passport',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบข้อมูลการกำหนดเป้าหมาย'
      });
    }

    // Log audit
    await logAudit('version_targeting_deleted', 'consent_version_targeting', id, req.user.id, req.ip);

    res.json({
      success: true,
      message: 'ลบการกำหนดเป้าหมายเรียบร้อย'
    });

  } catch (error) {
    console.error('Delete version targeting error:', error);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการลบข้อมูล'
    });
  }
});

// POST /api/consent/version-targeting/bulk - Bulk create version targeting
router.post('/bulk', authMiddleware, [
  body('idPassports')
    .isArray()
    .withMessage('ID/Passport list must be an array'),
  body('idPassports.*')
    .custom(validateIDOrPassport)
    .withMessage('Invalid ID or Passport number'),
  body('consentVersionId')
    .isInt()
    .withMessage('Consent version ID must be a number')
], async (req, res) => {
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

    const { idPassports, consentVersionId, startDate, endDate } = req.body;

    // Check if consent version exists
    const versionCheck = await client.query(
      'SELECT id, version FROM consent_versions WHERE id = $1',
      [consentVersionId]
    );

    if (versionCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: 'ไม่พบเวอร์ชันที่ระบุ'
      });
    }

    const results = [];
    const failedItems = [];

    for (const idPassport of idPassports) {
      try {
        // Deactivate existing targeting
        await client.query(
          'UPDATE consent_version_targeting SET is_active = false WHERE id_passport = $1',
          [idPassport]
        );

        // Insert new targeting
        const result = await client.query(
          `INSERT INTO consent_version_targeting 
           (id_passport, consent_version_id, start_date, end_date, created_by, is_active)
           VALUES ($1, $2, $3, $4, $5, true)
           RETURNING id`,
          [
            idPassport,
            consentVersionId,
            startDate || null,
            endDate || null,
            req.user.username
          ]
        );

        results.push({
          idPassport,
          id: result.rows[0].id,
          success: true
        });

      } catch (error) {
        failedItems.push({
          idPassport,
          error: error.message
        });
      }
    }

    await client.query('COMMIT');

    // Log audit
    await logAudit('version_targeting_bulk_created', 'consent_version_targeting', null, req.user.id, req.ip, {
      total: idPassports.length,
      success: results.length,
      failed: failedItems.length
    });

    res.status(201).json({
      success: true,
      message: `กำหนดเป้าหมายสำเร็จ ${results.length} รายการ`,
      data: {
        successful: results,
        failed: failedItems
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Bulk version targeting error:', error);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการกำหนดเป้าหมาย'
    });
  } finally {
    client.release();
  }
});

module.exports = router;
