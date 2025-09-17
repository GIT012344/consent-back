const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /api/admin/statistics - Get consent statistics
router.get('/statistics', async (req, res) => {
  try {
    const { tenant, startDate, endDate, audience, language } = req.query;
    
    // Build query with filters
    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramIndex = 1;
    
    if (tenant) {
      whereClause += ` AND t.code = $${paramIndex++}`;
      params.push(tenant);
    }
    
    if (startDate) {
      whereClause += ` AND uc.accepted_at >= $${paramIndex++}`;
      params.push(startDate);
    }
    
    if (endDate) {
      whereClause += ` AND uc.accepted_at <= $${paramIndex++}`;
      params.push(endDate);
    }
    
    if (audience) {
      whereClause += ` AND uc.audience = $${paramIndex++}`;
      params.push(audience);
    }
    
    if (language) {
      whereClause += ` AND uc.lang = $${paramIndex++}`;
      params.push(language);
    }
    
    // Get total consents
    const totalQuery = `
      SELECT COUNT(*) as total
      FROM user_consents uc
      LEFT JOIN tenants t ON uc.tenant_id = t.id
      ${whereClause}
    `;
    const totalResult = await pool.query(totalQuery, params);
    
    // Get today's consents
    const todayQuery = `
      SELECT COUNT(*) as today
      FROM user_consents uc
      LEFT JOIN tenants t ON uc.tenant_id = t.id
      ${whereClause} AND DATE(uc.accepted_at) = CURRENT_DATE
    `;
    const todayResult = await pool.query(todayQuery, params);
    
    // Get consents by audience
    const audienceQuery = `
      SELECT uc.audience, COUNT(*) as count
      FROM user_consents uc
      LEFT JOIN tenants t ON uc.tenant_id = t.id
      ${whereClause}
      GROUP BY uc.audience
    `;
    const audienceResult = await pool.query(audienceQuery, params);
    
    // Get consents by language
    const languageQuery = `
      SELECT uc.lang as language, COUNT(*) as count
      FROM user_consents uc
      LEFT JOIN tenants t ON uc.tenant_id = t.id
      ${whereClause}
      GROUP BY uc.lang
    `;
    const languageResult = await pool.query(languageQuery, params);
    
    // Get daily trend (last 7 days)
    const trendQuery = `
      SELECT DATE(uc.accepted_at) as date, COUNT(*) as count
      FROM user_consents uc
      LEFT JOIN tenants t ON uc.tenant_id = t.id
      ${whereClause} AND uc.accepted_at >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY DATE(uc.accepted_at)
      ORDER BY date
    `;
    const trendResult = await pool.query(trendQuery, params);
    
    res.json({
      success: true,
      data: {
        total: parseInt(totalResult.rows[0]?.total || 0),
        today: parseInt(todayResult.rows[0]?.today || 0),
        byAudience: audienceResult.rows,
        byLanguage: languageResult.rows,
        trend: trendResult.rows
      }
    });
    
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
});

// GET /api/admin/consents - Get consent records with pagination
router.get('/consents', async (req, res) => {
  try {
    const { 
      tenant, 
      startDate, 
      endDate, 
      audience, 
      language,
      page = 1,
      limit = 50 
    } = req.query;
    
    const offset = (page - 1) * limit;
    
    // Build query with filters
    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramIndex = 1;
    
    if (tenant) {
      whereClause += ` AND t.code = $${paramIndex++}`;
      params.push(tenant);
    }
    
    if (startDate) {
      whereClause += ` AND uc.accepted_at >= $${paramIndex++}`;
      params.push(startDate);
    }
    
    if (endDate) {
      whereClause += ` AND uc.accepted_at <= $${paramIndex++}`;
      params.push(endDate);
    }
    
    if (audience) {
      whereClause += ` AND uc.audience = $${paramIndex++}`;
      params.push(audience);
    }
    
    if (language) {
      whereClause += ` AND uc.lang = $${paramIndex++}`;
      params.push(language);
    }
    
    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM user_consents uc
      LEFT JOIN tenants t ON uc.tenant_id = t.id
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, params);
    const totalCount = parseInt(countResult.rows[0]?.total || 0);
    
    // Get consent records
    params.push(limit);
    params.push(offset);
    
    const query = `
      SELECT 
        uc.id,
        uc.consent_ref,
        uc.title,
        uc.first_name,
        uc.last_name,
        uc.id_last4,
        uc.email,
        uc.phone,
        uc.audience,
        uc.lang as language,
        uc.accepted_at,
        uc.ip_addr,
        t.name as tenant_name,
        pv.version as policy_version,
        pv.kind as policy_kind
      FROM user_consents uc
      LEFT JOIN tenants t ON uc.tenant_id = t.id
      LEFT JOIN policy_versions pv ON uc.policy_version_id = pv.id
      ${whereClause}
      ORDER BY uc.accepted_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;
    
    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    });
    
  } catch (error) {
    console.error('Error fetching consents:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch consents',
      error: error.message
    });
  }
});

// GET /api/admin/consent/:id - Get single consent details
router.get('/consent/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT 
        uc.*,
        t.name as tenant_name,
        pv.version as policy_version,
        pv.kind as policy_kind,
        pv.title as policy_title
      FROM user_consents uc
      LEFT JOIN tenants t ON uc.tenant_id = t.id
      LEFT JOIN policy_versions pv ON uc.policy_version_id = pv.id
      WHERE uc.consent_ref = $1
    `;
    
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Consent not found'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('Error fetching consent:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch consent',
      error: error.message
    });
  }
});

// POST /api/admin/export - Export consent data
router.post('/export', async (req, res) => {
  try {
    const { format = 'csv', filters = {} } = req.body;
    const { tenant, startDate, endDate, audience, language } = filters;
    
    // Build query with filters
    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramIndex = 1;
    
    if (tenant) {
      whereClause += ` AND t.code = $${paramIndex++}`;
      params.push(tenant);
    }
    
    if (startDate) {
      whereClause += ` AND uc.accepted_at >= $${paramIndex++}`;
      params.push(startDate);
    }
    
    if (endDate) {
      whereClause += ` AND uc.accepted_at <= $${paramIndex++}`;
      params.push(endDate);
    }
    
    if (audience) {
      whereClause += ` AND uc.audience = $${paramIndex++}`;
      params.push(audience);
    }
    
    if (language) {
      whereClause += ` AND uc.lang = $${paramIndex++}`;
      params.push(language);
    }
    
    const query = `
      SELECT 
        uc.consent_ref as "Consent ID",
        t.name as "Tenant",
        uc.title as "Title",
        uc.first_name as "First Name",
        uc.last_name as "Last Name",
        uc.id_last4 as "ID Last 4",
        uc.email as "Email",
        uc.phone as "Phone",
        uc.audience as "Audience",
        uc.lang as "Language",
        pv.kind as "Policy Type",
        pv.version as "Policy Version",
        uc.accepted_at as "Accepted Date",
        uc.ip_addr as "IP Address"
      FROM user_consents uc
      LEFT JOIN tenants t ON uc.tenant_id = t.id
      LEFT JOIN policy_versions pv ON uc.policy_version_id = pv.id
      ${whereClause}
      ORDER BY uc.accepted_at DESC
    `;
    
    const result = await pool.query(query, params);
    
    if (format === 'json') {
      res.json({
        success: true,
        data: result.rows
      });
    } else {
      // Convert to CSV
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No data to export'
        });
      }
      
      const headers = Object.keys(result.rows[0]).join(',');
      const rows = result.rows.map(row => 
        Object.values(row).map(val => {
          if (val === null) return '';
          if (typeof val === 'string' && val.includes(',')) return `"${val}"`;
          return val;
        }).join(',')
      );
      
      const csv = [headers, ...rows].join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=consent_export_${Date.now()}.csv`);
      res.send(csv);
    }
    
  } catch (error) {
    console.error('Error exporting data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export data',
      error: error.message
    });
  }
});

module.exports = router;
