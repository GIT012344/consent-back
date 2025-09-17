const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { Parser } = require('json2csv');

// GET /api/admin/reports/consents - Export consent records with all required fields
router.get('/admin/reports/consents', async (req, res) => {
  try {
    const { 
      tenant, 
      startDate, 
      endDate, 
      format = 'json',
      audience,
      language,
      policyKind 
    } = req.query;
    
    let query = `
      SELECT 
        uc.consent_ref as "Consent Reference",
        t.tenant_name as "Tenant",
        t.tenant_code as "Tenant Code",
        pv.kind as "Policy Type",
        pv.version as "Policy Version",
        pv.title as "Policy Title",
        uc.audience as "Audience",
        uc.lang as "Language",
        uc.title as "Title",
        uc.first_name as "First Name",
        uc.last_name as "Last Name",
        uc.id_type as "ID Type",
        uc.id_last4 as "ID Last 4 Digits",
        uc.email as "Email",
        uc.phone as "Phone",
        uc.ip_addr as "IP Address",
        uc.user_agent as "User Agent",
        uc.accepted_at as "Accepted Date",
        uc.is_active as "Is Active",
        pv.is_mandatory as "Was Mandatory",
        pv.grace_days as "Grace Days",
        pv.enforce_mode as "Enforce Mode",
        pv.effective_from as "Policy Effective From",
        pv.effective_to as "Policy Effective To"
      FROM user_consents uc
      JOIN tenants t ON uc.tenant_id = t.id
      JOIN policy_versions pv ON uc.policy_version_id = pv.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;
    
    if (tenant) {
      query += ` AND t.tenant_code = $${paramIndex++}`;
      params.push(tenant);
    }
    
    if (startDate) {
      query += ` AND uc.accepted_at >= $${paramIndex++}`;
      params.push(startDate);
    }
    
    if (endDate) {
      query += ` AND uc.accepted_at <= $${paramIndex++}`;
      params.push(endDate);
    }
    
    if (audience) {
      query += ` AND uc.audience = $${paramIndex++}`;
      params.push(audience);
    }
    
    if (language) {
      query += ` AND uc.lang = $${paramIndex++}`;
      params.push(language);
    }
    
    if (policyKind) {
      query += ` AND pv.kind = $${paramIndex++}`;
      params.push(policyKind);
    }
    
    query += ' ORDER BY uc.accepted_at DESC';
    
    const result = await pool.query(query, params);
    
    if (format === 'csv') {
      // Convert to CSV
      const fields = Object.keys(result.rows[0] || {});
      const opts = { fields };
      const parser = new Parser(opts);
      const csv = parser.parse(result.rows);
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=consent_report_${Date.now()}.csv`);
      res.send(csv);
    } else {
      // Return JSON
      res.json({
        success: true,
        data: result.rows,
        count: result.rows.length,
        exportedAt: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Error generating consent report:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// GET /api/admin/reports/statistics - Get consent statistics
router.get('/admin/reports/statistics', async (req, res) => {
  try {
    const { tenant, startDate, endDate, groupBy = 'day' } = req.query;
    
    let dateFormat;
    switch(groupBy) {
      case 'hour':
        dateFormat = "DATE_TRUNC('hour', uc.accepted_at)";
        break;
      case 'day':
        dateFormat = "DATE_TRUNC('day', uc.accepted_at)";
        break;
      case 'week':
        dateFormat = "DATE_TRUNC('week', uc.accepted_at)";
        break;
      case 'month':
        dateFormat = "DATE_TRUNC('month', uc.accepted_at)";
        break;
      default:
        dateFormat = "DATE_TRUNC('day', uc.accepted_at)";
    }
    
    let query = `
      SELECT 
        ${dateFormat} as period,
        COUNT(*) as total_consents,
        COUNT(DISTINCT uc.id_number_hash) as unique_users,
        COUNT(DISTINCT uc.policy_version_id) as versions_used,
        uc.audience,
        uc.lang as language,
        pv.kind as policy_kind,
        t.tenant_name,
        t.tenant_code
      FROM user_consents uc
      JOIN tenants t ON uc.tenant_id = t.id
      JOIN policy_versions pv ON uc.policy_version_id = pv.id
      WHERE uc.is_active = true
    `;
    
    const params = [];
    let paramIndex = 1;
    
    if (tenant) {
      query += ` AND t.tenant_code = $${paramIndex++}`;
      params.push(tenant);
    }
    
    if (startDate) {
      query += ` AND uc.accepted_at >= $${paramIndex++}`;
      params.push(startDate);
    }
    
    if (endDate) {
      query += ` AND uc.accepted_at <= $${paramIndex++}`;
      params.push(endDate);
    }
    
    query += ` GROUP BY ${dateFormat}, uc.audience, uc.lang, pv.kind, t.tenant_name, t.tenant_code`;
    query += ' ORDER BY period DESC';
    
    const result = await pool.query(query, params);
    
    // Get summary statistics
    const summaryQuery = `
      SELECT 
        COUNT(*) as total_consents,
        COUNT(DISTINCT uc.id_number_hash) as unique_users,
        COUNT(DISTINCT uc.policy_version_id) as versions_used,
        COUNT(DISTINCT uc.tenant_id) as tenants_count
      FROM user_consents uc
      WHERE uc.is_active = true
    `;
    
    const summaryResult = await pool.query(summaryQuery);
    
    res.json({
      success: true,
      summary: summaryResult.rows[0],
      data: result.rows,
      groupBy,
      period: {
        start: startDate || 'all',
        end: endDate || 'all'
      }
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// GET /api/admin/reports/compliance - Get compliance report
router.get('/admin/reports/compliance', async (req, res) => {
  try {
    const { tenant } = req.query;
    
    let query = `
      WITH mandatory_policies AS (
        SELECT DISTINCT
          pv.tenant,
          pv.kind,
          pv.locale,
          pv.audiences,
          pv.version,
          pv.is_mandatory,
          pv.grace_days,
          pv.effective_from,
          pv.effective_to
        FROM policy_versions pv
        WHERE pv.is_published = true
          AND pv.is_mandatory = true
          AND pv.effective_from <= NOW()
          AND (pv.effective_to IS NULL OR pv.effective_to > NOW())
      ),
      consent_coverage AS (
        SELECT 
          mp.tenant,
          mp.kind,
          mp.locale,
          COUNT(DISTINCT uc.id_number_hash) as consented_users,
          mp.version,
          mp.grace_days,
          mp.effective_from
        FROM mandatory_policies mp
        LEFT JOIN user_consents uc ON (
          uc.policy_version_id IN (
            SELECT id FROM policy_versions 
            WHERE tenant = mp.tenant 
              AND kind = mp.kind 
              AND locale = mp.locale
              AND version = mp.version
          )
          AND uc.is_active = true
        )
        GROUP BY mp.tenant, mp.kind, mp.locale, mp.version, mp.grace_days, mp.effective_from
      )
      SELECT 
        cc.tenant as "Tenant",
        cc.kind as "Policy Type",
        cc.locale as "Language",
        cc.version as "Version",
        cc.consented_users as "Consented Users",
        cc.grace_days as "Grace Days",
        cc.effective_from as "Effective From",
        CASE 
          WHEN cc.effective_from + INTERVAL '1 day' * cc.grace_days > NOW() 
          THEN 'In Grace Period'
          ELSE 'Grace Period Expired'
        END as "Grace Status"
      FROM consent_coverage cc
    `;
    
    const params = [];
    
    if (tenant) {
      query += ' WHERE cc.tenant = $1';
      params.push(tenant);
    }
    
    query += ' ORDER BY cc.tenant, cc.kind, cc.locale';
    
    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      data: result.rows,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error generating compliance report:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// GET /api/admin/reports/audit-trail - Get audit trail for consent operations
router.get('/admin/reports/audit-trail', async (req, res) => {
  try {
    const { entityType = 'user_consent', startDate, endDate, page = 1, limit = 100 } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT 
        al.id,
        al.entity_type,
        al.entity_id,
        al.action,
        al.user_name,
        al.changes,
        al.ip_address,
        al.created_at
      FROM audit_logs al
      WHERE al.entity_type = $1
    `;
    
    const params = [entityType];
    let paramIndex = 2;
    
    if (startDate) {
      query += ` AND al.created_at >= $${paramIndex++}`;
      params.push(startDate);
    }
    
    if (endDate) {
      query += ` AND al.created_at <= $${paramIndex++}`;
      params.push(endDate);
    }
    
    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM (${query}) as subquery`;
    const countResult = await pool.query(countQuery, params);
    const totalCount = parseInt(countResult.rows[0].total);
    
    // Add pagination
    query += ` ORDER BY al.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching audit trail:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
