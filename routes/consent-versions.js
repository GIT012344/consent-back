const express = require('express');
const { pool } = require('../config/database');
const router = express.Router();

// GET /api/consent/versions - Get all consent versions
router.get('/versions', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        cv.*,
        COUNT(DISTINCT cr.id) as usage_count
      FROM consent_versions cv
      LEFT JOIN consent_records cr ON cr.consent_version_id = cv.id
      GROUP BY cv.id
      ORDER BY cv.created_at DESC
    `);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching consent versions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch consent versions',
      error: error.message
    });
  }
});

// GET /api/consent/versions/active - Get active versions by user type and language
router.get('/versions/active', async (req, res) => {
  try {
    const { userType, language } = req.query;
    
    let query = `
      SELECT * FROM consent_versions 
      WHERE is_active = true
    `;
    const params = [];
    
    if (userType) {
      params.push(userType);
      query += ` AND user_type = $${params.length}`;
    }
    
    if (language) {
      params.push(language);
      query += ` AND language = $${params.length}`;
    }
    
    query += ' ORDER BY created_at DESC';
    
    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching active versions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch active versions',
      error: error.message
    });
  }
});

// POST /api/consent/versions - Create new consent version
router.post('/versions', async (req, res) => {
  try {
    const {
      version,
      language,
      user_type,
      description,
      file_path,
      file_name,
      file_size,
      content,
      is_active,
      created_by
    } = req.body;

    // Check if version already exists
    const existing = await pool.query(
      'SELECT id FROM consent_versions WHERE version = $1 AND language = $2 AND user_type = $3',
      [version, language || 'th', user_type || 'customer']
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Version already exists for this language and user type'
      });
    }

    // If setting as active, deactivate other versions for same user_type and language
    if (is_active) {
      await pool.query(
        'UPDATE consent_versions SET is_active = false WHERE user_type = $1 AND language = $2',
        [user_type || 'customer', language || 'th']
      );
    }

    const result = await pool.query(
      `INSERT INTO consent_versions 
       (version, language, user_type, description, file_path, file_name, file_size, content, is_active, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        version,
        language || 'th',
        user_type || 'customer',
        description,
        file_path,
        file_name,
        file_size,
        content,
        is_active || false,
        created_by || 'admin'
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Consent version created successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating consent version:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create consent version',
      error: error.message
    });
  }
});

// PUT /api/consent/versions/:id - Update consent version
router.put('/versions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      version,
      language,
      user_type,
      description,
      file_path,
      file_name,
      file_size,
      content,
      is_active
    } = req.body;

    // Check if version exists
    const existing = await pool.query('SELECT * FROM consent_versions WHERE id = $1', [id]);
    
    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Consent version not found'
      });
    }

    // If setting as active, deactivate other versions for same user_type and language
    if (is_active) {
      await pool.query(
        'UPDATE consent_versions SET is_active = false WHERE user_type = $1 AND language = $2 AND id != $3',
        [user_type || existing.rows[0].user_type, language || existing.rows[0].language, id]
      );
    }

    const result = await pool.query(
      `UPDATE consent_versions 
       SET version = COALESCE($1, version),
           language = COALESCE($2, language),
           user_type = COALESCE($3, user_type),
           description = COALESCE($4, description),
           file_path = COALESCE($5, file_path),
           file_name = COALESCE($6, file_name),
           file_size = COALESCE($7, file_size),
           content = COALESCE($8, content),
           is_active = COALESCE($9, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $10
       RETURNING *`,
      [version, language, user_type, description, file_path, file_name, file_size, content, is_active, id]
    );

    res.json({
      success: true,
      message: 'Consent version updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating consent version:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update consent version',
      error: error.message
    });
  }
});

// PUT /api/consent/versions/:id/toggle - Toggle active status
router.put('/versions/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get current version
    const current = await pool.query('SELECT * FROM consent_versions WHERE id = $1', [id]);
    
    if (current.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Consent version not found'
      });
    }

    const version = current.rows[0];
    const newStatus = !version.is_active;

    // If activating, deactivate other versions for same user_type and language
    if (newStatus) {
      await pool.query(
        'UPDATE consent_versions SET is_active = false WHERE user_type = $1 AND language = $2 AND id != $3',
        [version.user_type, version.language, id]
      );
    }

    const result = await pool.query(
      'UPDATE consent_versions SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [newStatus, id]
    );

    res.json({
      success: true,
      message: `Version ${newStatus ? 'activated' : 'deactivated'} successfully`,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error toggling version status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle version status',
      error: error.message
    });
  }
});

// DELETE /api/consent/versions/:id - Delete consent version
router.delete('/versions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if version is being used
    const usage = await pool.query(
      'SELECT COUNT(*) as count FROM consent_records WHERE consent_version_id = $1',
      [id]
    );
    
    if (parseInt(usage.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete version that has been used in consent records'
      });
    }

    const result = await pool.query(
      'DELETE FROM consent_versions WHERE id = $1 RETURNING *',
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
      message: 'Consent version deleted successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error deleting consent version:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete consent version',
      error: error.message
    });
  }
});

// GET /api/consent/active-version/:userType/:language - Get active version for specific user type and language
router.get('/active-version/:userType/:language', async (req, res) => {
  try {
    const { userType, language } = req.params;
    
    // Try to find exact match
    let result = await pool.query(
      `SELECT * FROM consent_versions 
       WHERE user_type = $1 AND language = $2 AND is_active = true 
       ORDER BY created_at DESC LIMIT 1`,
      [userType, language]
    );

    // If no exact match, try user type only
    if (result.rows.length === 0) {
      result = await pool.query(
        `SELECT * FROM consent_versions 
         WHERE user_type = $1 AND is_active = true 
         ORDER BY created_at DESC LIMIT 1`,
        [userType]
      );
    }

    // If still no match, get any active version
    if (result.rows.length === 0) {
      result = await pool.query(
        `SELECT * FROM consent_versions 
         WHERE is_active = true 
         ORDER BY created_at DESC LIMIT 1`
      );
    }

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No active consent version found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching active version:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch active version',
      error: error.message
    });
  }
});

module.exports = router;
