const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

// PUT /api/simple-policy/:id/toggle - Toggle policy active status
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

module.exports = router;
