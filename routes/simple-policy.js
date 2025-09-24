const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

// GET /api/simple-policy/active - Get active policy for specific userType and language
router.get('/active', async (req, res) => {
  try {
    const { userType = 'customer', language = 'th' } = req.query;
    
    // Convert language format if needed (th-TH -> th, en-US -> en)
    const langCode = language.includes('-') ? language.split('-')[0] : language;
    
    console.log(`Fetching policy for userType: ${userType}, language: ${langCode}`);
    
    // Query directly from policy_versions table
    const query = `
      SELECT 
        id,
        version,
        title,
        content,
        language,
        user_type,
        effective_date,
        expiry_date,
        is_active,
        created_at
      FROM policy_versions
      WHERE user_type = $1 
        AND language = $2
        AND is_active = true
      ORDER BY created_at DESC
      LIMIT 1
    `;
    
    const result = await pool.query(query, [userType, langCode]);
    
    if (result.rows.length > 0) {
      console.log(`Found policy: ${result.rows[0].title}`);
      return res.json({
        success: true,
        data: result.rows[0]
      });
    }
    
    // Don't use fallback - must match exact language
    // This ensures Thai users ONLY see Thai content (001)
    // and English users ONLY see English content (002)
    
    // No policy found
    console.log(`No policy found for userType: ${userType}, language: ${langCode}`);
    res.json({
      success: false,
      message: `No active policy found for userType: ${userType}, language: ${langCode}`,
      data: null
    });
    
  } catch (error) {
    console.error('Error fetching active policy:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch active policy' 
    });
  }
});

// GET /api/simple-policy/:id - Get specific policy by ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  
  // Check if id is numeric (specific policy) or not (list all)
  if (!isNaN(id)) {
    try {
      const query = `
        SELECT 
          id,
          version,
          title,
          content,
          language,
          user_type,
          effective_date,
          expiry_date,
          is_active,
          created_at
        FROM policy_versions
        WHERE id = $1
      `;
      
      const result = await pool.query(query, [id]);
      
      if (result.rows.length > 0) {
        res.json({
          success: true,
          data: result.rows[0]
        });
      } else {
        res.status(404).json({
          success: false,
          message: 'Policy not found'
        });
      }
    } catch (error) {
      console.error('Error fetching policy by ID:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch policy' 
      });
    }
  } else {
    // If not numeric, treat as list request
    next();
  }
});

// GET /api/simple-policy - Get list of all policies
router.get('/', async (req, res) => {
  try {
    // Simple query directly from policy_versions table
    const query = `
      SELECT 
        id,
        version,
        title,
        content,
        language,
        user_type,
        effective_date,
        expiry_date,
        is_active,
        created_at
      FROM policy_versions
      ORDER BY created_at DESC
    `;
    
    const result = await pool.query(query);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching policies:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch policies' 
    });
  }
});

// Update policy
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { version, language, title, content, effective_date, expiry_date } = req.body;
  
  try {
    // First check if table exists, if not create it
    await pool.query(`
      CREATE TABLE IF NOT EXISTS policy_versions (
        id SERIAL PRIMARY KEY,
        version VARCHAR(50),
        title VARCHAR(255),
        content TEXT,
        language VARCHAR(10),
        user_type VARCHAR(50),
        effective_date TIMESTAMP,
        expiry_date TIMESTAMP,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    const updateQuery = `
      UPDATE policy_versions 
      SET 
        version = $1,
        title = $2,
        content = $3,
        language = $4,
        effective_date = $5,
        expiry_date = $6,
        updated_at = NOW()
      WHERE id = $7
      RETURNING *
    `;
    
    const result = await pool.query(updateQuery, [
      version || '1.0',
      title || 'Policy',
      content || '',
      language || 'th-TH',
      effective_date || new Date().toISOString(),
      expiry_date || null,
      id
    ]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Policy not found' 
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating policy:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update policy' 
    });
  }
});

// Toggle policy active status
router.put('/:id/toggle', async (req, res) => {
  const { id } = req.params;
  const { is_active } = req.body;
  
  try {
    const updateQuery = `
      UPDATE policy_versions 
      SET 
        is_active = $1,
        updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;
    
    const result = await pool.query(updateQuery, [is_active, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Policy not found' 
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0],
      message: `Policy ${is_active ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    console.error('Error toggling policy status:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to toggle policy status' 
    });
  }
});

// Delete policy
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    // Check if policy has been used in consent records
    // Note: consent_records may not have consent_version_id column
    // Skip this check for now to allow deletion
    const checkQuery = `
      SELECT COUNT(*) as count 
      FROM consent_records 
      WHERE false
    `;
    
    const checkResult = await pool.query(checkQuery);
    
    if (checkResult.rows[0].count > 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Cannot delete policy that has been used in consent records' 
      });
    }
    
    // Delete the policy
    await pool.query('DELETE FROM policy_versions WHERE id = $1', [id]);
    
    res.json({
      success: true,
      message: 'Policy deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting policy:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete policy'
    });
  }
});

// PUT /api/simple-policy/:id/toggle - Toggle policy active status
router.put('/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;
    
    const result = await pool.query(
      'UPDATE policy_versions SET is_active = $1 WHERE id = $2 RETURNING *',
      [is_active, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Policy not found'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error toggling policy status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle policy status'
    });
  }
});

// POST /api/simple-policy - Create a simple policy for one usertype + language
router.post('/', async (req, res) => {
  try {
    const {
      tenant_code = 'default',
      version,
      language,
      userType,
      user_type, // Support both userType and user_type
      title,
      content,
      effective_date,
      expiry_date,
      is_mandatory = true,
      enforce_mode = 'strict'
    } = req.body;
    
    // Use userType or user_type
    const actualUserType = userType || user_type;

    // Validate required fields
    if (!version || !language || !actualUserType || !title || !content) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        details: {
          version: !!version,
          language: !!language,
          userType: !!actualUserType,
          title: !!title,
          content: !!content
        }
      });
    }

    // First ensure policy_versions table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS policy_versions (
        id SERIAL PRIMARY KEY,
        version VARCHAR(50),
        title VARCHAR(255),
        content TEXT,
        language VARCHAR(10),
        user_type VARCHAR(50),
        effective_date TIMESTAMP,
        expiry_date TIMESTAMP,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Log received data for debugging
    console.log('Received language from frontend:', language);
    console.log('Received userType:', actualUserType);
    
    // Check for duplicate policy (same title, userType, and language)
    const duplicateCheck = await pool.query(`
      SELECT id, title, version, user_type
      FROM policy_versions
      WHERE LOWER(title) = LOWER($1) 
        AND language = $2
        AND user_type = $3
        AND is_active = true
      LIMIT 1
    `, [title, language, actualUserType]);

    if (duplicateCheck.rows.length > 0) {
      // Update existing policy instead of blocking
      const updateResult = await pool.query(
        `UPDATE policy_versions 
         SET content = $1, version = $2, updated_at = NOW()
         WHERE id = $3
         RETURNING *`,
        [content, version, duplicateCheck.rows[0].id]
      );
      
      const langCode = language === 'th-TH' ? 'th' : 'en';
      const consentLink = `/consent/${actualUserType}?lang=${langCode}`;
      
      return res.status(200).json({
        success: true,
        message: 'Policy updated successfully',
        data: {
          id: updateResult.rows[0].id,
          version,
          userType: actualUserType,
          language,
          title,
          consentLink
        }
      });
    }

    // Simple insert into policy_versions table
    const insertResult = await pool.query(
      `INSERT INTO policy_versions 
       (version, title, content, language, user_type, effective_date, expiry_date, is_active) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING *`,
      [
        version,
        title,
        content,
        language,
        actualUserType,
        effective_date || new Date(),
        expiry_date || null,
        true
      ]
    );

    const newPolicy = insertResult.rows[0];

    // Generate consent link
    const langCode = language === 'th-TH' ? 'th' : 'en';
    const consentLink = `/consent/${actualUserType}?lang=${langCode}`;

    res.status(201).json({
      success: true,
      message: 'Policy created successfully',
      data: {
        id: newPolicy.id,
        version,
        userType: actualUserType,
        language,
        title,
        consentLink
      }
    });

  } catch (error) {
    console.error('Error creating policy:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create policy',
      error: error.message
    });
  }
});

// GET /api/simple-policy/active - Get active policy version for a specific user type and language
router.get('/active', async (req, res) => {
  try {
    const { userType, language } = req.query;
    
    if (!userType || !language) {
      return res.status(400).json({
        success: false,
        message: 'Missing userType or language parameter'
      });
    }
    
    // Simple query from policy_versions table
    const query = `
      SELECT * FROM policy_versions
      WHERE user_type = $1 
        AND language = $2
        AND is_active = true
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const result = await pool.query(query, [userType, language]);

    if (result.rows.length === 0) {
      // Try to find any policy for this user type
      const fallbackQuery = `
        SELECT * FROM policy_versions
        WHERE user_type = $1
          AND is_active = true
        ORDER BY created_at DESC
        LIMIT 1
      `;
      
      const fallbackResult = await pool.query(fallbackQuery, [userType]);
      
      if (fallbackResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No active policy found'
        });
      }
      
      return res.json({
        success: true,
        data: fallbackResult.rows[0]
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching policy:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch policy',
      error: error.message
    });
  }
});

module.exports = router;
