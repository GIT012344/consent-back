const express = require('express');
const router = express.Router();
const pool = require('../config/database').pool;
const crypto = require('crypto');

// Generate consent ID
const generateConsentId = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'C-';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Hash ID number with salt
const hashIdNumber = (idNumber) => {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(idNumber, salt, 1000, 64, 'sha512').toString('hex');
  return { hash, salt };
};

// Get last 4 digits
const getLastFour = (idNumber) => {
  return idNumber.slice(-4);
};

// Get tenant config
router.get('/tenant/:tenant/config', async (req, res) => {
  try {
    const { tenant } = req.params;
    
    const result = await pool.query(`
      SELECT audiences, default_language 
      FROM tenants 
      WHERE code = $1
    `, [tenant]);
    
    if (result.rows.length === 0) {
      // Return default config if tenant not found
      return res.json({
        audiences: ['customer'],
        defaultLanguage: 'th'
      });
    }
    
    res.json({
      audiences: result.rows[0].audiences || ['customer'],
      defaultLanguage: result.rows[0].default_language || 'th'
    });
  } catch (error) {
    console.error('Error fetching tenant config:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get latest consent version
router.get('/consent/version/latest', async (req, res) => {
  try {
    const { tenant, audience, language } = req.query;
    
    // Mock response for testing
    const mockVersion = {
      id: 1,
      title: language === 'th' 
        ? 'ข้อตกลงและเงื่อนไขการให้บริการ' 
        : 'Terms and Conditions',
      content: language === 'th'
        ? `<h3>ข้อตกลงการใช้งาน</h3>
           <p>1. ข้าพเจ้ายินยอมให้บริษัทเก็บรวบรวม ใช้ และเปิดเผยข้อมูลส่วนบุคคลของข้าพเจ้า</p>
           <p>2. ข้อมูลจะถูกเก็บรักษาอย่างปลอดภัยตามมาตรฐาน PDPA</p>
           <p>3. ข้าพเจ้าสามารถขอแก้ไขหรือลบข้อมูลได้ตามสิทธิที่กฎหมายกำหนด</p>`
        : `<h3>Terms of Service</h3>
           <p>1. I consent to the collection, use, and disclosure of my personal data</p>
           <p>2. Data will be securely stored according to PDPA standards</p>
           <p>3. I can request to modify or delete my data as per legal rights</p>`,
      version: '1.0.0',
      effectiveFrom: new Date().toISOString()
    };
    
    res.json(mockVersion);
  } catch (error) {
    console.error('Error fetching consent version:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Accept consent
router.post('/consent/accept', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const {
      tenant,
      policyVersionId,
      audience,
      language,
      title,
      firstName,
      lastName,
      idType,
      idNumber,
      acceptTerms,
      snapshotHtml,
      userAgent: clientUserAgent
    } = req.body;
    
    // Get IP address
    const ipAddress = req.headers['x-forwarded-for'] || 
                     req.connection.remoteAddress || 
                     req.socket.remoteAddress ||
                     req.ip;
    
    const userAgent = clientUserAgent || req.headers['user-agent'] || '';
    
    // Hash ID number
    const { hash: idHash, salt } = hashIdNumber(idNumber);
    const idLast4 = getLastFour(idNumber);
    
    // Generate consent ID
    const consentId = generateConsentId();
    
    // Check if consent already exists
    const existingConsent = await client.query(`
      SELECT consent_ref, accepted_at 
      FROM user_consents 
      WHERE id_number_hash = $1 
        AND policy_version_id = $2
        AND tenant_id = (SELECT id FROM tenants WHERE code = $3)
      LIMIT 1
    `, [idHash, policyVersionId, tenant]);
    
    if (existingConsent.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: 'Consent already exists',
        existingConsent: {
          consentId: existingConsent.rows[0].consent_ref,
          acceptedAt: existingConsent.rows[0].accepted_at
        }
      });
    }
    
    // Get or create tenant
    let tenantResult = await client.query(
      'SELECT id FROM tenants WHERE code = $1',
      [tenant]
    );
    
    if (tenantResult.rows.length === 0) {
      tenantResult = await client.query(`
        INSERT INTO tenants (code, name, audiences, default_language)
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `, [tenant, tenant, ['customer'], 'th']);
    }
    
    const tenantId = tenantResult.rows[0].id;
    
    // Insert consent record
    const insertResult = await client.query(`
      INSERT INTO user_consents (
        tenant_id,
        policy_version_id,
        consent_ref,
        audience,
        lang,
        title,
        first_name,
        last_name,
        id_type,
        id_number_hash,
        id_salt,
        id_last4,
        ip_addr,
        user_agent,
        accepted_at,
        snapshot_html
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING id, consent_ref, accepted_at
    `, [
      tenantId,
      policyVersionId || 1, // Use provided ID or default to 1
      consentId,
      audience,
      language,
      title,
      firstName,
      lastName,
      idType,
      idHash,
      salt,
      idLast4,
      ipAddress,
      userAgent,
      new Date(),
      snapshotHtml
    ]);
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      consentId: insertResult.rows[0].consent_ref,
      acceptedAt: insertResult.rows[0].accepted_at
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error accepting consent:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// Export consent data as CSV
router.get('/consent/export/:tenant', async (req, res) => {
  try {
    const { tenant } = req.params;
    const { startDate, endDate } = req.query;
    
    let query = `
      SELECT
        uc.title AS "Title",
        CONCAT(uc.first_name, ' ', uc.last_name) AS "Name-Surname",
        CONCAT(UPPER(uc.id_type), ' ****', uc.id_last4) AS "ID",
        DATE(uc.accepted_at AT TIME ZONE 'Asia/Bangkok') AS "Created Date",
        TO_CHAR(uc.accepted_at AT TIME ZONE 'Asia/Bangkok', 'HH24:MI:SS') AS "Created Time",
        uc.consent_ref AS "Consent ID",
        INITCAP(uc.audience) AS "ConsentType",
        UPPER(uc.lang) AS "Consent Language",
        uc.ip_addr AS "IP Address",
        uc.user_agent AS "Browser"
      FROM user_consents uc
      JOIN tenants t ON uc.tenant_id = t.id
      WHERE t.code = $1
    `;
    
    const params = [tenant];
    
    if (startDate) {
      query += ` AND uc.accepted_at >= $${params.length + 1}`;
      params.push(startDate);
    }
    
    if (endDate) {
      query += ` AND uc.accepted_at <= $${params.length + 1}`;
      params.push(endDate);
    }
    
    query += ' ORDER BY uc.accepted_at DESC';
    
    const result = await pool.query(query, params);
    
    // Convert to CSV
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'No data found' });
    }
    
    const headers = Object.keys(result.rows[0]);
    const csvContent = [
      headers.join(','),
      ...result.rows.map(row => 
        headers.map(header => {
          const value = row[header];
          // Escape quotes and wrap in quotes if contains comma
          if (value && value.toString().includes(',')) {
            return `"${value.toString().replace(/"/g, '""')}"`;
          }
          return value || '';
        }).join(',')
      )
    ].join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="consent_export_${tenant}_${Date.now()}.csv"`);
    res.send(csvContent);
    
  } catch (error) {
    console.error('Error exporting consent data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
