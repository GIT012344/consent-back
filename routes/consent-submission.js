const express = require('express');
const router = express.Router();
const pool = require('../db');
const crypto = require('crypto');

// Generate consent reference
function generateConsentRef() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const random = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `C-${date}-${random}`;
}

// Hash ID number with salt
const hashIdNumber = (idNumber) => {
  const salt = process.env.ID_HASH_SALT || 'default-salt-change-in-production';
  return crypto.createHash('sha256').update(idNumber + salt).digest('hex');
};

// POST /api/consent/submit - Submit consent
router.post('/consent/submit', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const {
      tenant,
      policy_version_id,
      audience,
      language,
      title,
      first_name,
      last_name,
      id_type,
      id_number,
      email,
      phone,
      snapshot_html
    } = req.body;
    
    // Validate required fields
    if (!tenant || !policy_version_id || !first_name || !last_name || !id_number) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }
    
    // Get tenant ID
    const tenantResult = await client.query(
      'SELECT id FROM tenants WHERE code = $1',
      [tenant]
    );
    
    if (tenantResult.rows.length === 0) {
      // Auto-create tenant if not exists
      const newTenant = await client.query(
        `INSERT INTO tenants (code, name, audiences, default_language) 
         VALUES ($1, $2, $3, $4) 
         RETURNING id`,
        [tenant, tenant, ['customer', 'employee', 'partner'], 'th']
      );
      tenantResult.rows = [{ id: newTenant.rows[0].id }];
    }
    
    const tenantId = tenantResult.rows[0].id;
    
    // Check for existing consent
    const existingCheck = await client.query(
      `SELECT consent_ref, created_at 
       FROM user_consents 
       WHERE tenant_id = $1 
         AND policy_version_id = $2 
         AND id_number_hash = $3`,
      [tenantId, policy_version_id, hashIdNumber(id_number)]
    );
    
    if (existingCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        error: 'Already consented',
        data: {
          consent_ref: existingCheck.rows[0].consent_ref,
          accepted_at: existingCheck.rows[0].created_at
        }
      });
    }
    
    // Generate consent reference
    const consentRef = generateConsentRef();
    
    // Hash ID number
    const idHash = hashIdNumber(id_number);
    const idLast4 = id_number.slice(-4);
    
    // Get client IP and user agent
    const ipAddr = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];
    
    // Insert consent record
    const insertResult = await client.query(
      `INSERT INTO user_consents (
        tenant_id, policy_version_id, consent_ref,
        audience, language,
        title, first_name, last_name,
        id_type, id_number_hash, id_last4,
        email, phone,
        snapshot_html, ip_addr, user_agent,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW())
      RETURNING id, consent_ref, created_at`,
      [
        tenantId, policy_version_id, consentRef,
        audience, language,
        title, first_name, last_name,
        id_type, idHash, idLast4,
        email, phone,
        snapshot_html, ipAddr, userAgent
      ]
    );
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      data: {
        consent_ref: consentRef,
        accepted_at: insertResult.rows[0].created_at,
        message: 'Consent recorded successfully'
      }
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error submitting consent:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process consent'
    });
  } finally {
    client.release();
  }
});

// GET /api/consent/check/:idNumber - Check consent status
router.get('/consent/check/:idNumber', async (req, res) => {
  try {
    const { idNumber } = req.params;
    const idHash = hashIdNumber(idNumber);
    
    const result = await pool.query(
      `SELECT 
        uc.consent_ref,
        uc.created_at as accepted_at,
        uc.audience,
        uc.language,
        uc.title,
        uc.first_name,
        uc.last_name,
        uc.id_last4,
        pv.version,
        pv.title as policy_title,
        t.name as tenant_name
      FROM user_consents uc
      JOIN policy_versions pv ON uc.policy_version_id = pv.id
      JOIN tenants t ON uc.tenant_id = t.id
      WHERE uc.id_number_hash = $1
      ORDER BY uc.created_at DESC`,
      [idHash]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No consent found'
      });
    }
    
    res.json({
      success: true,
      data: result.rows
    });
    
  } catch (error) {
    console.error('Error checking consent:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check consent'
    });
  }
});

module.exports = router;
