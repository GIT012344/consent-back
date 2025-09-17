const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Get all form fields
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM consent_form_fields ORDER BY display_order, id'
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching form fields:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get single form field
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM consent_form_fields WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Form field not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error fetching form field:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create new form field
router.post('/', async (req, res) => {
  try {
    const { 
      field_name, 
      field_label_th, 
      field_label_en, 
      field_type, 
      is_required, 
      is_active, 
      display_order,
      options 
    } = req.body;
    
    const result = await pool.query(
      `INSERT INTO consent_form_fields 
       (field_name, field_label_th, field_label_en, field_type, is_required, is_active, display_order, options) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING *`,
      [
        field_name, 
        field_label_th, 
        field_label_en, 
        field_type, 
        is_required || false, 
        is_active !== false, 
        display_order || 0,
        JSON.stringify(options || [])
      ]
    );
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error creating form field:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update form field
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      field_name, 
      field_label_th, 
      field_label_en, 
      field_type, 
      is_required, 
      is_active, 
      display_order,
      options 
    } = req.body;
    
    const result = await pool.query(
      `UPDATE consent_form_fields 
       SET field_name = $1, field_label_th = $2, field_label_en = $3, 
           field_type = $4, is_required = $5, is_active = $6, 
           display_order = $7, options = $8, updated_at = NOW()
       WHERE id = $9
       RETURNING *`,
      [
        field_name, 
        field_label_th, 
        field_label_en, 
        field_type, 
        is_required, 
        is_active, 
        display_order || 0,
        JSON.stringify(options || []),
        id
      ]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Form field not found' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating form field:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete form field
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM consent_form_fields WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Form field not found' });
    }
    
    res.json({ success: true, message: 'Form field deleted successfully' });
  } catch (error) {
    console.error('Error deleting form field:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
