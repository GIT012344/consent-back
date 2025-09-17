const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { pool } = require('../config/database');
const { authMiddleware, logAudit } = require('./admin');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/consent-versions');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `consent-v${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow PDF, DOC, DOCX, HTML files
    const allowedTypes = ['.pdf', '.doc', '.docx', '.html', '.htm'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOC, DOCX, and HTML files are allowed.'));
    }
  }
});

// POST /api/upload/consent-version - Upload new consent version
router.post('/consent-version', upload.single('consentFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const {
      version,
      language = 'th',
      title = '',
      description = '',
      userType = 'customer',
      isActive = true
    } = req.body;

    if (!version) {
      return res.status(400).json({
        success: false,
        message: 'Version number is required'
      });
    }

    // Check if version already exists for this language
    const existingVersion = await pool.query(
      'SELECT id FROM consent_versions WHERE version = $1 AND language = $2',
      [version, language]
    );

    if (existingVersion.rows.length > 0) {
      // Delete uploaded file if version exists
      await fs.unlink(req.file.path);
      return res.status(409).json({
        success: false,
        message: `Version ${version} already exists for ${language} language`
      });
    }

    // Insert new consent version
    const insertQuery = `
      INSERT INTO consent_versions 
      (version, language, description, user_type, file_path, file_name, file_size, is_active, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const result = await pool.query(insertQuery, [
      version,
      language,
      description,
      userType,
      req.file.path,
      req.file.originalname,
      req.file.size.toString(),
      isActive,
      req.ip // Using IP as created_by for now
    ]);

    res.status(201).json({
      success: true,
      message: 'Consent version uploaded successfully',
      data: {
        id: result.rows[0].id,
        version: result.rows[0].version,
        language: result.rows[0].language,
        fileName: result.rows[0].file_name,
        fileSize: result.rows[0].file_size,
        uploadedAt: result.rows[0].created_at
      }
    });

  } catch (error) {
    // Clean up uploaded file on error
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting file:', unlinkError);
      }
    }

    console.error('Error uploading consent version:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload consent version',
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
});

// GET /api/upload/consent-version/:id/content - Get consent version content
router.get('/consent-version/:id/content', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get version details
    const versionQuery = `
      SELECT id, version, language, user_type, file_path, file_name, mime_type
      FROM consent_versions 
      WHERE id = $1
    `;
    
    const versionResult = await pool.query(versionQuery, [id]);
    
    if (versionResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Consent version not found'
      });
    }
    
    const version = versionResult.rows[0];
    const filePath = version.file_path;
    
    // Check if file exists
    if (!filePath || !await fs.access(filePath).then(() => true).catch(() => false)) {
      return res.status(404).json({
        success: false,
        message: 'Consent file not found'
      });
    }
    
    // Read file content based on mime type
    let content = '';
    if (version.mime_type === 'text/html' || version.mime_type === 'text/plain') {
      content = await fs.readFile(filePath, 'utf8');
    } else {
      // For PDF/DOC files, return file path for download
      content = `File type: ${version.mime_type}. Please download to view.`;
    }
    
    res.json({
      success: true,
      data: {
        id: version.id,
        version: version.version,
        language: version.language,
        userType: version.user_type,
        fileName: version.file_name,
        mimeType: version.mime_type,
        content: content
      }
    });
    
  } catch (error) {
    console.error('Error fetching consent content:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch consent content',
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
});

// GET /api/upload/consent-versions - List all consent versions
router.get('/consent-versions', async (req, res) => {
  try {
    const language = req.query.language || '';
    const isActive = req.query.active !== undefined ? req.query.active === 'true' : null;

    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;

    if (language) {
      whereConditions.push(`language = $${paramIndex}`);
      queryParams.push(language);
      paramIndex++;
    }

    if (isActive !== null) {
      whereConditions.push(`is_active = $${paramIndex}`);
      queryParams.push(isActive);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const query = `
      SELECT id, version, language, description, file_name, file_size, 
             mime_type, is_active, created_at, updated_at
      FROM consent_versions 
      ${whereClause}
      ORDER BY created_at DESC
    `;

    const result = await pool.query(query, queryParams);

    res.json({
      success: true,
      data: {
        versions: result.rows,
        total: result.rows.length
      }
    });

  } catch (error) {
    console.error('Error fetching consent versions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch consent versions',
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
});

// GET /api/upload/consent-version/:id/download - Download consent version file
router.get('/consent-version/:id/download', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT file_path, file_name, mime_type FROM consent_versions WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Consent version not found'
      });
    }

    const { file_path, file_name, mime_type } = result.rows[0];

    // Check if file exists
    try {
      await fs.access(file_path);
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: 'File not found on server'
      });
    }

    // Set headers for file download
    res.setHeader('Content-Type', mime_type);
    res.setHeader('Content-Disposition', `attachment; filename="${file_name}"`);

    // Stream file to response
    const fileStream = require('fs').createReadStream(file_path);
    fileStream.pipe(res);

  } catch (error) {
    console.error('Error downloading consent version:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download file',
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
});

// PUT /api/upload/consent-version/:id/toggle - Toggle active status
router.put('/consent-version/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'UPDATE consent_versions SET is_active = NOT is_active, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Consent version not found'
      });
    }

    res.json({
      success: true,
      message: `Consent version ${result.rows[0].is_active ? 'activated' : 'deactivated'}`,
      data: {
        id: result.rows[0].id,
        version: result.rows[0].version,
        isActive: result.rows[0].is_active
      }
    });

  } catch (error) {
    console.error('Error toggling consent version:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle consent version',
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
});

// DELETE /api/upload/consent-version/:id - Delete consent version
router.delete('/consent-version/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Get file path before deletion
    const fileResult = await pool.query(
      'SELECT file_path FROM consent_versions WHERE id = $1',
      [id]
    );

    if (fileResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Consent version not found'
      });
    }

    const filePath = fileResult.rows[0].file_path;

    // Delete from database
    await pool.query('DELETE FROM consent_versions WHERE id = $1', [id]);

    // Delete file from filesystem
    try {
      await fs.unlink(filePath);
    } catch (fileError) {
      console.warn('Warning: Could not delete file from filesystem:', fileError.message);
    }

    res.json({
      success: true,
      message: 'Consent version deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting consent version:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete consent version',
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
});

module.exports = router;
