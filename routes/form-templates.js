const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

// GET /api/form-templates - Get all templates or by user type
router.get('/', async (req, res) => {
  try {
    const { userType, language, active } = req.query;
    
    let query = 'SELECT * FROM form_templates WHERE 1=1';
    const params = [];
    let paramCount = 0;
    
    if (userType) {
      query += ` AND user_type = $${++paramCount}`;
      params.push(userType);
    }
    
    if (language) {
      query += ` AND language = $${++paramCount}`;
      params.push(language);
    }
    
    if (active !== undefined) {
      query += ` AND is_active = $${++paramCount}`;
      params.push(active === 'true');
    }
    
    query += ' ORDER BY user_type, created_at DESC';
    
    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      data: result.rows
    });
    
  } catch (error) {
    console.error('Error fetching form templates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch form templates'
    });
  }
});

// GET /api/form-templates/active/:userType/:language - Get active template for user type
router.get('/active/:userType/:language', async (req, res) => {
  try {
    const { userType, language } = req.params;
    
    // First try exact match
    let result = await pool.query(
      `SELECT * FROM form_templates 
       WHERE user_type = $1 AND language = $2 AND is_active = true 
       ORDER BY created_at DESC LIMIT 1`,
      [userType, language]
    );
    
    // If no exact match, try user type only
    if (result.rows.length === 0) {
      result = await pool.query(
        `SELECT * FROM form_templates 
         WHERE user_type = $1 AND is_active = true 
         ORDER BY created_at DESC LIMIT 1`,
        [userType]
      );
    }
    
    // If still no match, get any active template
    if (result.rows.length === 0) {
      result = await pool.query(
        `SELECT * FROM form_templates 
         WHERE is_active = true 
         ORDER BY created_at DESC LIMIT 1`
      );
    }
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No active form template found'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('Error fetching active form template:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch active form template'
    });
  }
});

// POST /api/form-templates - Create new template
router.post('/', async (req, res) => {
  try {
    const { userType, fields, consentText, language = 'th' } = req.body;
    
    if (!userType || !fields) {
      return res.status(400).json({
        success: false,
        message: 'userType and fields are required'
      });
    }
    
    // Deactivate existing templates for this user type
    await pool.query(
      'UPDATE form_templates SET is_active = false WHERE user_type = $1',
      [userType]
    );
    
    // Insert new template
    const result = await pool.query(
      `INSERT INTO form_templates (user_type, fields, consent_text, language, is_active)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userType, JSON.stringify(fields), consentText, language, true]
    );
    
    res.json({
      success: true,
      data: result.rows[0],
      message: 'Form template created successfully'
    });
    
  } catch (error) {
    console.error('Error creating form template:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create form template'
    });
  }
});

// PUT /api/form-templates/:id - Update template
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { fields, consentText, isActive } = req.body;
    
    let updateQuery = 'UPDATE form_templates SET updated_at = CURRENT_TIMESTAMP';
    const params = [];
    let paramCount = 0;
    
    if (fields !== undefined) {
      updateQuery += `, fields = $${++paramCount}`;
      params.push(JSON.stringify(fields));
    }
    
    if (consentText !== undefined) {
      updateQuery += `, consent_text = $${++paramCount}`;
      params.push(consentText);
    }
    
    if (isActive !== undefined) {
      updateQuery += `, is_active = $${++paramCount}`;
      params.push(isActive);
    }
    
    updateQuery += ` WHERE id = $${++paramCount} RETURNING *`;
    params.push(id);
    
    const result = await pool.query(updateQuery, params);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Form template not found'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0],
      message: 'Form template updated successfully'
    });
    
  } catch (error) {
    console.error('Error updating form template:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update form template'
    });
  }
});

// DELETE /api/form-templates/:id - Delete template
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM form_templates WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Form template not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Form template deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting form template:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete form template'
    });
  }
});

// POST /api/form-templates/assign - Assign template to user type
router.post('/assign', async (req, res) => {
  try {
    const { userType, templateId } = req.body;
    
    if (!userType || !templateId) {
      return res.status(400).json({
        success: false,
        message: 'userType and templateId are required'
      });
    }
    
    // Deactivate all templates for this user type
    await pool.query(
      'UPDATE form_templates SET is_active = false WHERE user_type = $1',
      [userType]
    );
    
    // Activate selected template
    const result = await pool.query(
      'UPDATE form_templates SET is_active = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND user_type = $2 RETURNING *',
      [templateId, userType]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Template not found for this user type'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0],
      message: 'Template assigned successfully'
    });
    
  } catch (error) {
    console.error('Error assigning template:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign template'
    });
  }
});

module.exports = router;
