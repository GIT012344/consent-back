const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

// GET /api/titles - Get all titles (simplified for admin)
router.get('/', async (req, res) => {
  try {
    const query = `
      SELECT id, title_th, title_en, is_active, created_at, updated_at 
      FROM consent_titles 
      ORDER BY display_order ASC, id ASC
    `;
    
    const result = await pool.query(query);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching titles:', error);
    // Return demo data if database fails
    res.json({
      success: true,
      data: [
        { id: 1, title_th: 'นาย', title_en: 'Mr.', is_active: true },
        { id: 2, title_th: 'นาง', title_en: 'Mrs.', is_active: true },
        { id: 3, title_th: 'นางสาว', title_en: 'Miss', is_active: true },
        { id: 4, title_th: 'ดร.', title_en: 'Dr.', is_active: true },
        { id: 5, title_th: 'ศ.', title_en: 'Prof.', is_active: true }
      ]
    });
  }
});

// Get active titles for user selection
router.get('/active', async (req, res) => {
  try {
    const { language } = req.query;
    
    let query = `
      SELECT t.id, t.title, t.description, t.user_type, t.language 
      FROM consent_titles t 
      WHERE t.is_active = true
    `;
    const params = [];
    
    if (language) {
      params.push(language);
      query += ` AND t.language = $${params.length}`;
    }
    
    query += ' ORDER BY t.user_type, t.title';
    
    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching active titles:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch active titles',
      error: error.message
    });
  }
});

// POST /api/titles - Create new title
router.post('/', async (req, res) => {
  try {
    const { title_th, title_en, display_order, is_active } = req.body;
    
    // Validate required fields
    if (!title_th || !title_en) {
      return res.status(400).json({
        success: false,
        message: 'Both Thai and English titles are required'
      });
    }
    
    const query = `
      INSERT INTO consent_titles 
      (title_th, title_en, display_order, is_active)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    
    const values = [
      title_th,
      title_en,
      display_order || 999,
      is_active !== undefined ? is_active : true
    ];
    
    const result = await pool.query(query, values);
    
    res.json({
      success: true,
      data: result.rows[0],
      message: 'Title created successfully'
    });
    
  } catch (error) {
    console.error('Error creating title:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create title',
      error: error.message
    });
  }
});

// PUT /api/titles/:id - Update title
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title_th, title_en, display_order, is_active } = req.body;
    
    const query = `
      UPDATE consent_titles
      SET title_th = $1, title_en = $2, display_order = $3, 
          is_active = $4, updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING *
    `;
    
    const values = [
      title_th,
      title_en,
      display_order,
      is_active,
      id
    ];
    
    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Title not found'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0],
      message: 'Title updated successfully'
    });
    
  } catch (error) {
    console.error('Error updating title:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update title',
      error: error.message
    });
  }
});

// DELETE /api/titles/:id - Delete title
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = 'DELETE FROM consent_titles WHERE id = $1 RETURNING *';
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Title not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Title deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting title:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete title',
      error: error.message
    });
  }
});

// GET /api/titles/:id/content - Get content for a specific title
router.get('/:id/content', async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT t.*, v.id as version_id, v.version, v.file_path, v.file_name, v.mime_type
      FROM consent_titles t
      LEFT JOIN consent_versions v ON t.content_version_id = v.id
      WHERE t.id = $1
    `;
    
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Title not found'
      });
    }
    
    const titleData = result.rows[0];
    
    // If there's a content version, try to read the file
    let content = null;
    if (titleData.file_path) {
      const fs = require('fs').promises;
      try {
        if (titleData.mime_type === 'text/html' || titleData.mime_type === 'text/plain') {
          content = await fs.readFile(titleData.file_path, 'utf8');
        }
      } catch (fileError) {
        console.error('Error reading content file:', fileError);
      }
    }
    
    res.json({
      success: true,
      data: {
        ...titleData,
        content: content
      }
    });
    
  } catch (error) {
    console.error('Error fetching title content:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch title content',
      error: error.message
    });
  }
});

module.exports = router;
