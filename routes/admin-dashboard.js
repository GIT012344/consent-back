const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

// GET /api/admin/dashboard/stats
router.get('/dashboard/stats', async (req, res) => {
  try {
    // Get total consents
    const totalResult = await pool.query('SELECT COUNT(*) as count FROM consent_records');
    const total = parseInt(totalResult.rows[0].count);

    // Get today's consents
    const todayResult = await pool.query(`
      SELECT COUNT(*) as count 
      FROM consent_records 
      WHERE DATE(created_date) = CURRENT_DATE
    `);
    const today = parseInt(todayResult.rows[0].count);

    // Get this week's consents
    const weekResult = await pool.query(`
      SELECT COUNT(*) as count 
      FROM consent_records 
      WHERE created_date >= CURRENT_DATE - INTERVAL '7 days'
    `);
    const thisWeek = parseInt(weekResult.rows[0].count);

    // Get this month's consents
    const monthResult = await pool.query(`
      SELECT COUNT(*) as count 
      FROM consent_records 
      WHERE DATE_TRUNC('month', created_date) = DATE_TRUNC('month', CURRENT_DATE)
    `);
    const thisMonth = parseInt(monthResult.rows[0].count);

    // Get stats by version
    const versionResult = await pool.query(`
      SELECT 
        consent_version as version,
        COUNT(*) as count
      FROM consent_records
      WHERE consent_version IS NOT NULL
      GROUP BY consent_version
      ORDER BY count DESC
      LIMIT 5
    `);

    // Get stats by user type
    const audienceResult = await pool.query(`
      SELECT 
        COALESCE(user_type, 'customer') as audience,
        COUNT(*) as count
      FROM consent_records
      GROUP BY user_type
      ORDER BY count DESC
    `);

    // Get stats by language
    const languageResult = await pool.query(`
      SELECT 
        COALESCE(consent_language, 'th') as language,
        COUNT(*) as count
      FROM consent_records
      GROUP BY consent_language
      ORDER BY count DESC
    `);

    res.json({
      success: true,
      data: {
        total,
        today,
        thisWeek,
        thisMonth,
        byVersion: versionResult.rows,
        byAudience: audienceResult.rows,
        byLanguage: languageResult.rows
      }
    });

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics'
    });
  }
});

// GET /api/admin/dashboard/recent
router.get('/dashboard/recent', async (req, res) => {
  try {
    const { limit = 10, offset = 0 } = req.query;

    const result = await pool.query(`
      SELECT 
        id,
        name_surname,
        id_passport,
        user_type,
        consent_type,
        consent_language,
        consent_version,
        ip_address,
        browser,
        created_date,
        created_time,
        is_active
      FROM consent_records
      ORDER BY created_date DESC, created_time DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    const countResult = await pool.query('SELECT COUNT(*) as total FROM consent_records');
    const total = parseInt(countResult.rows[0].total);

    res.json({
      success: true,
      data: {
        consents: result.rows,
        total,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });

  } catch (error) {
    console.error('Error fetching recent consents:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recent consents'
    });
  }
});

// GET /api/admin/dashboard/export
router.get('/dashboard/export', async (req, res) => {
  try {
    const { format = 'json', startDate, endDate } = req.query;
    
    let query = `
      SELECT 
        name_surname,
        id_passport,
        user_type,
        consent_type,
        consent_language,
        consent_version,
        ip_address,
        browser,
        created_date,
        created_time
      FROM consent_records
      WHERE 1=1
    `;
    
    const params = [];
    if (startDate) {
      params.push(startDate);
      query += ` AND created_date >= $${params.length}`;
    }
    if (endDate) {
      params.push(endDate);
      query += ` AND created_date <= $${params.length}`;
    }
    
    query += ' ORDER BY created_date DESC, created_time DESC';
    
    const result = await pool.query(query, params);
    
    if (format === 'csv') {
      // Generate CSV
      const headers = Object.keys(result.rows[0] || {}).join(',');
      const rows = result.rows.map(row => 
        Object.values(row).map(val => 
          typeof val === 'string' && val.includes(',') ? `"${val}"` : val
        ).join(',')
      );
      const csv = [headers, ...rows].join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=consents-${new Date().toISOString().split('T')[0]}.csv`);
      res.send(csv);
    } else {
      res.json({
        success: true,
        data: result.rows
      });
    }
    
  } catch (error) {
    console.error('Error exporting consents:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export consents'
    });
  }
});

module.exports = router;
