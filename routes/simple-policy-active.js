const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

// GET /api/simple-policy/active - Get active policy for specific userType and language
router.get('/active', async (req, res) => {
  try {
    const { userType = 'customer', language = 'th-TH' } = req.query;
    
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
    
    const result = await pool.query(query, [userType, language]);
    
    if (result.rows.length > 0) {
      return res.json({
        success: true,
        data: result.rows[0]
      });
    }
    
    // No policy found
    res.json({
      success: false,
      message: `No active policy found for userType: ${userType}, language: ${language}`,
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

module.exports = router;
