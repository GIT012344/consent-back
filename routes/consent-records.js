const express = require('express');
const router = express.Router();
const pool = require('../db');

// Get all consent records with filters
router.get('/', async (req, res) => {
  try {
    const { 
      search, 
      userType, 
      status, 
      startDate, 
      endDate,
      page = 1,
      limit = 10 
    } = req.query;

    let query = `
      SELECT 
        cr.id,
        cr.name_surname,
        cr.id_passport,
        cr.user_type,
        cr.consent_type,
        cr.consent_language,
        cr.consent_version,
        cr.ip_address,
        cr.created_date,
        cr.created_time,
        cr.is_active,
        cr.created_date as created_at,
        cr.created_date as updated_at
      FROM consent_records cr
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    // Add filters
    if (search) {
      paramCount++;
      query += ` AND (cr.name_surname ILIKE $${paramCount} OR cr.id_passport ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    if (userType && userType !== 'all') {
      paramCount++;
      query += ` AND cr.user_type = $${paramCount}`;
      params.push(userType);
    }

    if (status !== undefined && status !== 'all') {
      paramCount++;
      query += ` AND cr.is_active = $${paramCount}`;
      params.push(status === 'active');
    }

    if (startDate) {
      paramCount++;
      query += ` AND cr.created_date >= $${paramCount}`;
      params.push(startDate);
    }

    if (endDate) {
      paramCount++;
      query += ` AND cr.created_date <= $${paramCount}`;
      params.push(endDate);
    }

    // Add sorting and pagination
    query += ` ORDER BY cr.created_date DESC`;
    
    const offset = (page - 1) * limit;
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    params.push(limit);
    paramCount++;
    query += ` OFFSET $${paramCount}`;
    params.push(offset);

    const result = await pool.query(query, params);

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total
      FROM consent_records cr
      WHERE 1=1
    `;
    const countParams = [];
    let countParamCount = 0;

    if (search) {
      countParamCount++;
      countQuery += ` AND (cr.name_surname ILIKE $${countParamCount} OR cr.id_passport ILIKE $${countParamCount})`;
      countParams.push(`%${search}%`);
    }

    if (userType && userType !== 'all') {
      countParamCount++;
      countQuery += ` AND cr.user_type = $${countParamCount}`;
      countParams.push(userType);
    }

    if (status !== undefined && status !== 'all') {
      countParamCount++;
      countQuery += ` AND cr.is_active = $${countParamCount}`;
      countParams.push(status === 'active');
    }

    if (startDate) {
      countParamCount++;
      countQuery += ` AND cr.created_date >= $${countParamCount}`;
      countParams.push(startDate);
    }

    if (endDate) {
      countParamCount++;
      countQuery += ` AND cr.created_date <= $${countParamCount}`;
      countParams.push(endDate);
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0]?.total || 0);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching consent records:', error);
    
    // Return empty data on error instead of mock
    res.json({
      success: false,
      error: error.message,
      data: [],
      pagination: {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0
      }
    });
  }
});

// Get single consent record
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT 
        cr.*,
        cv.version_name,
        cv.language,
        cv.content
      FROM consent_records cr
      LEFT JOIN consent_versions cv ON cr.consent_version_id = cv.id
      WHERE cr.id = $1
    `;
    
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Consent record not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching consent record:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching consent record'
    });
  }
});

// Toggle consent record status
router.put('/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params;
    
    // First get current status
    const currentResult = await pool.query(
      'SELECT is_active FROM consent_records WHERE id = $1',
      [id]
    );
    
    if (currentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Consent record not found'
      });
    }
    
    const newStatus = !currentResult.rows[0].is_active;
    
    // Update status
    const updateResult = await pool.query(
      'UPDATE consent_records SET is_active = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [newStatus, id]
    );

    res.json({
      success: true,
      data: updateResult.rows[0],
      message: `Consent record ${newStatus ? 'enabled' : 'disabled'} successfully`
    });
  } catch (error) {
    console.error('Error toggling consent record:', error);
    res.status(500).json({
      success: false,
      message: 'Error toggling consent record status'
    });
  }
});

// Delete consent record
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if record exists
    const checkResult = await pool.query(
      'SELECT id FROM consent_records WHERE id = $1',
      [id]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Consent record not found'
      });
    }
    
    // Delete record
    await pool.query('DELETE FROM consent_records WHERE id = $1', [id]);

    res.json({
      success: true,
      message: 'Consent record deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting consent record:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting consent record'
    });
  }
});

// Bulk delete consent records
router.post('/bulk-delete', async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No IDs provided for deletion'
      });
    }
    
    // Create placeholders for query
    const placeholders = ids.map((_, index) => `$${index + 1}`).join(',');
    
    // Delete records
    const result = await pool.query(
      `DELETE FROM consent_records WHERE id IN (${placeholders}) RETURNING id`,
      ids
    );

    res.json({
      success: true,
      message: `${result.rowCount} consent records deleted successfully`,
      deletedCount: result.rowCount
    });
  } catch (error) {
    console.error('Error bulk deleting consent records:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting consent records'
    });
  }
});

// Export consent records to CSV
router.get('/export/csv', async (req, res) => {
  try {
    const { userType, status, startDate, endDate } = req.query;
    
    let query = `
      SELECT 
        cr.id,
        cr.title,
        cr.name_surname,
        cr.id_passport,
        cr.email,
        cr.phone,
        cr.user_type,
        cv.version_name,
        cv.language,
        cr.is_active,
        cr.created_at,
        cr.updated_at
      FROM consent_records cr
      LEFT JOIN consent_versions cv ON cr.consent_version_id = cv.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (userType && userType !== 'all') {
      paramCount++;
      query += ` AND cr.user_type = $${paramCount}`;
      params.push(userType);
    }

    if (status !== undefined && status !== 'all') {
      paramCount++;
      query += ` AND cr.is_active = $${paramCount}`;
      params.push(status === 'active');
    }

    if (startDate) {
      paramCount++;
      query += ` AND cr.created_at >= $${paramCount}`;
      params.push(startDate);
    }

    if (endDate) {
      paramCount++;
      query += ` AND cr.created_at <= $${paramCount}`;
      params.push(endDate);
    }

    query += ` ORDER BY cr.created_at DESC`;

    const result = await pool.query(query, params);
    
    // Convert to CSV format
    const headers = [
      'ID',
      'Title',
      'Name',
      'ID/Passport',
      'Email',
      'Phone',
      'User Type',
      'Version',
      'Language',
      'Status',
      'Created At',
      'Updated At'
    ];
    
    const csvRows = [headers.join(',')];
    
    for (const row of result.rows) {
      const values = [
        row.id,
        row.title,
        row.name_surname,
        row.id_passport,
        row.email,
        row.phone,
        row.user_type,
        row.version_name,
        row.language,
        row.is_active ? 'Active' : 'Inactive',
        new Date(row.created_at).toLocaleString('th-TH'),
        new Date(row.updated_at).toLocaleString('th-TH')
      ];
      csvRows.push(values.map(v => `"${v || ''}"`).join(','));
    }
    
    const csvContent = csvRows.join('\n');
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="consent_records.csv"');
    res.send('\ufeff' + csvContent); // Add BOM for Excel UTF-8 support
  } catch (error) {
    console.error('Error exporting consent records:', error);
    res.status(500).json({
      success: false,
      message: 'Error exporting consent records'
    });
  }
});

module.exports = router;
