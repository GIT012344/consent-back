const express = require('express');
const router = express.Router();
const pool = require('../config/database').pool;
const { Parser } = require('json2csv');

// Export consents to CSV
router.get('/csv/:tenant', async (req, res) => {
  try {
    const { tenant } = req.params;
    const { startDate, endDate, audience, language } = req.query;

    let query = `
      SELECT
        uc.consent_ref,
        uc.title,
        uc.first_name,
        uc.last_name,
        uc.id_type,
        uc.id_last4,
        uc.audience,
        uc.lang as language,
        uc.ip_addr,
        uc.user_agent,
        uc.accepted_at,
        uc.policy_version_id,
        t.name as tenant_name
      FROM user_consents uc
      JOIN tenants t ON uc.tenant_id = t.id
      WHERE t.code = $1
    `;

    const params = [tenant];
    let paramIndex = 2;

    // Add filters
    if (startDate) {
      query += ` AND uc.accepted_at >= $${paramIndex}::timestamp`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      query += ` AND uc.accepted_at <= $${paramIndex}::timestamp`;
      params.push(endDate);
      paramIndex++;
    }

    if (audience) {
      query += ` AND uc.audience = $${paramIndex}`;
      params.push(audience);
      paramIndex++;
    }

    if (language) {
      query += ` AND uc.lang = $${paramIndex}`;
      params.push(language);
      paramIndex++;
    }

    query += ` ORDER BY uc.accepted_at DESC`;

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No consent records found'
      });
    }

    // Convert to CSV
    const csvData = result.rows.map(row => ({
      'Consent ID': row.consent_ref,
      'Date': new Date(row.accepted_at).toLocaleDateString('th-TH'),
      'Time': new Date(row.accepted_at).toLocaleTimeString('th-TH'),
      'Title': row.title,
      'First Name': row.first_name,
      'Last Name': row.last_name,
      'ID Type': row.id_type === 'thai_id' ? 'Thai ID' : 'Passport',
      'ID (Last 4)': row.id_last4 || 'XXXX',
      'Audience': row.audience,
      'Language': row.language?.toUpperCase() || 'TH',
      'Policy Version': row.policy_version_id,
      'IP Address': row.ip_addr,
      'User Agent': row.user_agent
    }));

    const fields = [
      'Consent ID',
      'Date',
      'Time',
      'Title',
      'First Name',
      'Last Name',
      'ID Type',
      'ID (Last 4)',
      'Audience',
      'Language',
      'Policy Version',
      'IP Address',
      'User Agent'
    ];

    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(csvData);

    // Set headers for download
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="consent_export_${tenant}_${new Date().toISOString().split('T')[0]}.csv"`);
    
    // Add BOM for Excel to recognize UTF-8
    res.send('\uFEFF' + csv);

  } catch (error) {
    console.error('Error exporting consents:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get consent statistics for dashboard
router.get('/stats/:tenant', async (req, res) => {
  try {
    const { tenant } = req.params;
    const { period = '7d' } = req.query;

    // Calculate date range
    let dateFilter = '';
    switch(period) {
      case '1d':
        dateFilter = "AND created_at >= NOW() - INTERVAL '1 day'";
        break;
      case '7d':
        dateFilter = "AND created_at >= NOW() - INTERVAL '7 days'";
        break;
      case '30d':
        dateFilter = "AND created_at >= NOW() - INTERVAL '30 days'";
        break;
      case 'all':
      default:
        dateFilter = '';
    }

    // Get total consents
    const totalQuery = `
      SELECT COUNT(*) as total
      FROM user_consents
      WHERE tenant = $1 ${dateFilter}
    `;
    const totalResult = await pool.query(totalQuery, [tenant]);

    // Get consents by audience
    const audienceQuery = `
      SELECT 
        COALESCE(audience, 'customer') as audience,
        COUNT(*) as count
      FROM user_consents
      WHERE tenant = $1 ${dateFilter}
      GROUP BY audience
    `;
    const audienceResult = await pool.query(audienceQuery, [tenant]);

    // Get consents by language
    const languageQuery = `
      SELECT 
        COALESCE(language, 'th') as language,
        COUNT(*) as count
      FROM user_consents
      WHERE tenant = $1 ${dateFilter}
      GROUP BY language
    `;
    const languageResult = await pool.query(languageQuery, [tenant]);

    // Get daily trend for the period
    const trendQuery = `
      SELECT 
        DATE(created_at AT TIME ZONE 'Asia/Bangkok') as date,
        COUNT(*) as count
      FROM user_consents
      WHERE tenant = $1 ${dateFilter}
      GROUP BY DATE(created_at AT TIME ZONE 'Asia/Bangkok')
      ORDER BY date DESC
      LIMIT 30
    `;
    const trendResult = await pool.query(trendQuery, [tenant]);

    res.json({
      success: true,
      data: {
        total: parseInt(totalResult.rows[0].total),
        byAudience: audienceResult.rows,
        byLanguage: languageResult.rows,
        trend: trendResult.rows
      }
    });

  } catch (error) {
    console.error('Error getting consent stats:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Check if re-consent is needed
router.post('/check-reconsent', async (req, res) => {
  try {
    const { tenant, idNumber } = req.body;

    if (!tenant || !idNumber) {
      return res.status(400).json({
        success: false,
        message: 'Tenant and ID number are required'
      });
    }

    const crypto = require('crypto');
    const idHash = crypto.createHash('sha256').update(idNumber).digest('hex');

    // Get latest consent for this user
    const lastConsentQuery = `
      SELECT 
        uc.id,
        uc.policy_version,
        uc.created_at,
        pv.version as current_version,
        pv.is_mandatory,
        pv.grace_days,
        pv.effective_from
      FROM user_consents uc
      LEFT JOIN policy_versions pv ON pv.tenant = uc.tenant 
        AND pv.is_published = true
        AND pv.effective_from <= NOW()
        AND (pv.effective_to IS NULL OR pv.effective_to > NOW())
      WHERE uc.tenant = $1 
        AND uc.id_hash = $2
      ORDER BY uc.created_at DESC
      LIMIT 1
    `;

    const result = await pool.query(lastConsentQuery, [tenant, idHash]);

    if (result.rows.length === 0) {
      // No previous consent, need new consent
      return res.json({
        success: true,
        needsConsent: true,
        reason: 'no_previous_consent'
      });
    }

    const lastConsent = result.rows[0];

    // Check if version changed
    if (lastConsent.policy_version !== lastConsent.current_version) {
      // Check grace period
      if (lastConsent.grace_days > 0) {
        const gracePeriodEnd = new Date(lastConsent.effective_from);
        gracePeriodEnd.setDate(gracePeriodEnd.getDate() + lastConsent.grace_days);
        
        if (new Date() < gracePeriodEnd) {
          return res.json({
            success: true,
            needsConsent: false,
            inGracePeriod: true,
            gracePeriodEnd: gracePeriodEnd.toISOString(),
            reason: 'in_grace_period'
          });
        }
      }

      return res.json({
        success: true,
        needsConsent: true,
        reason: 'version_changed',
        lastVersion: lastConsent.policy_version,
        currentVersion: lastConsent.current_version
      });
    }

    // Check yearly re-consent (if configured)
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    
    if (new Date(lastConsent.created_at) < oneYearAgo) {
      return res.json({
        success: true,
        needsConsent: true,
        reason: 'yearly_renewal'
      });
    }

    // No re-consent needed
    res.json({
      success: true,
      needsConsent: false,
      lastConsentId: lastConsent.id,
      lastConsentDate: lastConsent.created_at
    });

  } catch (error) {
    console.error('Error checking re-consent:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
