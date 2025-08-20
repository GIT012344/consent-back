const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { pool } = require('../config/database');
const { authMiddleware, logAudit } = require('./admin');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '..', 'uploads', 'consent-versions');
fs.mkdir(uploadsDir, { recursive: true }).catch(console.error);

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = `consent-v${req.body.version || 'unknown'}-${uniqueSuffix}${ext}`;
    cb(null, name);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB default
  },
  fileFilter: (req, file, cb) => {
    // Allow only specific file types
    const allowedTypes = ['.pdf', '.doc', '.docx', '.txt'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('ประเภทไฟล์ไม่ได้รับอนุญาต รองรับเฉพาะ PDF, DOC, DOCX, TXT'));
    }
  }
});

// Validation for consent version
const validateConsentVersion = [
  body('version')
    .trim()
    .notEmpty()
    .withMessage('กรุณาระบุเวอร์ชัน')
    .matches(/^\d+\.\d+$/)
    .withMessage('รูปแบบเวอร์ชันไม่ถูกต้อง (ตัวอย่าง: 1.0, 2.1)'),
  
  body('language')
    .optional()
    .isIn(['th', 'en'])
    .withMessage('ภาษาต้องเป็น th หรือ en'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('คำอธิบายต้องไม่เกิน 500 ตัวอักษร')
];

// POST /api/upload/consent-version - Upload new consent version
router.post('/consent-version', 
  authMiddleware, 
  upload.single('file'),
  validateConsentVersion,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        // Delete uploaded file if validation fails
        if (req.file) {
          await fs.unlink(req.file.path).catch(console.error);
        }
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { version, language = 'th', description } = req.body;

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'กรุณาเลือกไฟล์'
        });
      }

      // Check if version already exists
      const existingVersion = await pool.query(
        'SELECT id FROM consent_versions WHERE version = $1 AND language = $2',
        [version, language]
      );

      if (existingVersion.rows.length > 0) {
        // Delete uploaded file
        await fs.unlink(req.file.path).catch(console.error);
        return res.status(409).json({
          success: false,
          error: 'เวอร์ชันนี้มีอยู่แล้วในระบบ'
        });
      }

      // Insert consent version record
      const result = await pool.query(
        `INSERT INTO consent_versions 
         (version, language, description, file_path, file_name, file_size, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [
          version,
          language,
          description,
          req.file.path,
          req.file.originalname,
          (req.file.size / 1024).toFixed(2) + 'KB',
          req.user.username
        ]
      );

      // Log audit
      await logAudit('consent_version_uploaded', 'consent_versions', result.rows[0].id, req.user.id, req.ip, {
        version,
        language,
        fileName: req.file.originalname
      });

      res.status(201).json({
        success: true,
        data: {
          id: result.rows[0].id,
          version,
          fileName: req.file.originalname
        }
      });

    } catch (error) {
      // Delete uploaded file on error
      if (req.file) {
        await fs.unlink(req.file.path).catch(console.error);
      }
      
      console.error('Upload consent version error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'เกิดข้อผิดพลาดในการอัพโหลดไฟล์'
      });
    }
  }
);

// GET /api/upload/consent-versions - List all consent versions
router.get('/consent-versions', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        cv.id,
        cv.version,
        cv.language,
        cv.description,
        cv.is_active,
        cv.created_at,
        cv.file_name,
        cv.file_size,
        cv.created_by,
        COUNT(DISTINCT c.id) as usage_count
       FROM consent_versions cv
       LEFT JOIN consents c ON cv.id = c.consent_version_id
       GROUP BY cv.id
       ORDER BY cv.version DESC, cv.language`
    );

    res.json({
      success: true,
      data: result.rows.map(row => ({
        id: row.id,
        version: row.version,
        language: row.language,
        description: row.description,
        isActive: row.is_active,
        createdAt: row.created_at,
        fileName: row.file_name,
        fileSize: row.file_size,
        createdBy: row.created_by,
        usageCount: parseInt(row.usage_count)
      }))
    });

  } catch (error) {
    console.error('List consent versions error:', error);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการดึงข้อมูล'
    });
  }
});

// PUT /api/upload/consent-version/:id/toggle - Toggle active status
router.put('/consent-version/:id/toggle', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    // Get current status
    const current = await pool.query(
      'SELECT is_active, version, language FROM consent_versions WHERE id = $1',
      [id]
    );

    if (current.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบเวอร์ชันที่ระบุ'
      });
    }

    const newStatus = !current.rows[0].is_active;

    // If activating, deactivate others with same language
    if (newStatus) {
      await pool.query(
        'UPDATE consent_versions SET is_active = false WHERE language = $1 AND id != $2',
        [current.rows[0].language, id]
      );
    }

    // Update status
    await pool.query(
      'UPDATE consent_versions SET is_active = $1 WHERE id = $2',
      [newStatus, id]
    );

    // Log audit
    await logAudit('consent_version_toggled', 'consent_versions', id, req.user.id, req.ip, {
      version: current.rows[0].version,
      newStatus
    });

    res.json({
      success: true,
      message: 'อัพเดตสถานะเรียบร้อย'
    });

  } catch (error) {
    console.error('Toggle consent version error:', error);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการอัพเดตสถานะ'
    });
  }
});

// DELETE /api/upload/consent-version/:id - Delete consent version
router.delete('/consent-version/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if version is in use
    const usageCheck = await pool.query(
      'SELECT COUNT(*) as count FROM consents WHERE consent_version_id = $1',
      [id]
    );

    if (parseInt(usageCheck.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        error: 'ไม่สามารถลบเวอร์ชันที่มีการใช้งานแล้ว'
      });
    }

    // Get file path before deletion
    const fileInfo = await pool.query(
      'SELECT file_path, version FROM consent_versions WHERE id = $1',
      [id]
    );

    if (fileInfo.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบเวอร์ชันที่ระบุ'
      });
    }

    // Delete from database
    await pool.query('DELETE FROM consent_versions WHERE id = $1', [id]);

    // Delete file from filesystem
    if (fileInfo.rows[0].file_path) {
      await fs.unlink(fileInfo.rows[0].file_path).catch(console.error);
    }

    // Log audit
    await logAudit('consent_version_deleted', 'consent_versions', id, req.user.id, req.ip, {
      version: fileInfo.rows[0].version
    });

    res.json({
      success: true,
      message: 'ลบเวอร์ชันเรียบร้อย'
    });

  } catch (error) {
    console.error('Delete consent version error:', error);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการลบเวอร์ชัน'
    });
  }
});

// GET /api/upload/consent-version/:id/download - Download consent version file
router.get('/consent-version/:id/download', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT file_path, file_name FROM consent_versions WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบไฟล์ที่ระบุ'
      });
    }

    const { file_path, file_name } = result.rows[0];

    if (!file_path) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบไฟล์ในระบบ'
      });
    }

    // Check if file exists
    try {
      await fs.access(file_path);
    } catch {
      return res.status(404).json({
        success: false,
        error: 'ไฟล์ถูกลบออกจากระบบแล้ว'
      });
    }

    // Log audit
    await logAudit('consent_version_downloaded', 'consent_versions', id, req.user.id, req.ip);

    // Send file
    res.download(file_path, file_name);

  } catch (error) {
    console.error('Download consent version error:', error);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการดาวน์โหลดไฟล์'
    });
  }
});

// GET /api/upload/consent-version/:id - Get consent version details
router.get('/consent-version/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT 
        cv.*,
        COUNT(DISTINCT c.id) as usage_count,
        COUNT(DISTINCT cvt.id) as targeting_count
       FROM consent_versions cv
       LEFT JOIN consents c ON cv.id = c.consent_version_id
       LEFT JOIN consent_version_targeting cvt ON cv.id = cvt.consent_version_id
       WHERE cv.id = $1
       GROUP BY cv.id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบเวอร์ชันที่ระบุ'
      });
    }

    res.json({
      success: true,
      data: {
        ...result.rows[0],
        usageCount: parseInt(result.rows[0].usage_count),
        targetingCount: parseInt(result.rows[0].targeting_count)
      }
    });

  } catch (error) {
    console.error('Get consent version error:', error);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการดึงข้อมูล'
    });
  }
});

module.exports = router;
