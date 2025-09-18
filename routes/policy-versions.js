const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/policies');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'policy-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf|doc|docx|html|txt/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only PDF, DOC, DOCX, HTML, and TXT files are allowed'));
    }
  }
});

// Get all policy versions
router.get('/', async (req, res) => {
  try {
    const query = `
      SELECT 
        id,
        version,
        title,
        content,
        language,
        is_active,
        created_at,
        'customer' as user_type
      FROM policy_versions
      ORDER BY created_at DESC
    `;
    
    const result = await pool.query(query);
    res.json({ 
      success: true,
      data: result.rows 
    });
  } catch (error) {
    console.error('Error fetching policy versions:', error);
    res.status(500).json({ error: 'Failed to fetch policy versions' });
  }
});

// Get all tenants
router.get('/tenants', async (req, res) => {
  try {
    const query = `
      SELECT id, code, name, settings, is_active, created_at
      FROM tenants
      WHERE is_active = true
      ORDER BY name
    `;
    
    const result = await pool.query(query);
    res.json({ tenants: result.rows });
  } catch (error) {
    console.error('Error fetching tenants:', error);
    res.status(500).json({ error: 'Failed to fetch tenants' });
  }
});

// Create new policy version
router.post('/', upload.single('file'), async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { 
      tenant, kind, version, language, audience, title, content, isActive,
      effectiveFrom, effectiveTo, isMandatory, allowReject, graceDays, 
      enforceMode, reconsentTrigger 
    } = req.body;
    
    // Get tenant ID
    const tenantResult = await client.query(
      'SELECT id FROM tenants WHERE code = $1',
      [tenant || 'default']
    );
    
    let tenantId = tenantResult.rows[0]?.id;
    
    // Create tenant if not exists
    if (!tenantId) {
      const newTenant = await client.query(
        `INSERT INTO tenants (code, name, settings, is_active) 
         VALUES ($1, $2, $3, true) 
         RETURNING id`,
        [
          tenant || 'default',
          tenant || 'Default Organization',
          JSON.stringify({
            defaultAudience: audience || 'customer',
            defaultLanguage: language || 'th',
            audiences: [audience || 'customer'],
            languages: [language || 'th']
          })
        ]
      );
      tenantId = newTenant.rows[0].id;
    }
    
    // Check for duplicate version (tenant + kind + version + language)
    const duplicateCheck = await client.query(
      `SELECT id, title, is_published 
       FROM policy_versions 
       WHERE tenant_id = $1 
         AND kind = $2 
         AND version = $3 
         AND language = $4
       LIMIT 1`,
      [tenantId, kind || 'privacy', version || '1.0', language || 'th']
    );
    
    if (duplicateCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      const existing = duplicateCheck.rows[0];
      return res.status(409).json({ 
        error: 'Duplicate version exists',
        message: `Version ${version} already exists for ${tenant}/${kind}/${language}`,
        existing: {
          id: existing.id,
          title: existing.title,
          is_published: existing.is_published
        }
      });
    }
    
    // Deactivate previous versions if this is active
    if (isActive === 'true' || isActive === true) {
      await client.query(
        `UPDATE consent_versions 
         SET is_active = false 
         WHERE tenant_id = $1 AND kind = $2 AND audience = $3 AND language = $4`,
        [tenantId, kind || 'privacy', audience || 'customer', language || 'th']
      );
    }
    
    // Insert new policy version
    const insertQuery = `
      INSERT INTO policy_versions (
        tenant_id, kind, version, title, content, language, 
        audience, user_type, is_active, file_name, file_path, 
        file_size, mime_type, effective_from, effective_to,
        is_mandatory, allow_reject, grace_days, enforce_mode,
        reconsent_trigger, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, NOW(), NOW())
      RETURNING *
    `;
    
    const values = [
      tenantId,
      kind || 'privacy',
      version || '1.0',
      title || 'Consent Policy',
      content || '',
      language || 'th',
      audience || 'customer',
      audience || 'customer', // user_type same as audience
      isActive === 'true' || isActive === true,
      req.file?.originalname || null,
      req.file?.path || null,
      req.file?.size || 0,
      req.file?.mimetype || 'text/html',
      effectiveFrom || new Date().toISOString(),
      effectiveTo || null,
      isMandatory === 'true' || isMandatory === true || false,
      allowReject === 'true' || allowReject === true || false,
      parseInt(graceDays) || 0,
      enforceMode || 'login_gate',
      reconsentTrigger || 'version_change'
    ];
    
    const result = await client.query(insertQuery, values);
    
    await client.query('COMMIT');
    
    res.json({ 
      success: true, 
      policy: result.rows[0],
      message: 'Policy version created successfully'
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating policy version:', error);
    res.status(500).json({ error: 'Failed to create policy version' });
  } finally {
    client.release();
  }
});

// Publish/Unpublish policy version
router.put('/:id/publish', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    
    // Get policy details
    const policyResult = await client.query(
      'SELECT * FROM policy_versions WHERE id = $1',
      [id]
    );
    
    if (policyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Policy version not found' });
    }
    
    const policy = policyResult.rows[0];
    
    // Deactivate other versions of same type
    await client.query(
      `UPDATE consent_versions 
       SET is_active = false 
       WHERE tenant_id = $1 AND kind = $2 AND audience = $3 AND language = $4 AND id != $5`,
      [policy.tenant_id, policy.kind, policy.audience, policy.language, id]
    );
    
    // Activate this version
    await client.query(
      'UPDATE consent_versions SET is_active = true, updated_at = NOW() WHERE id = $1',
      [id]
    );
    
    await client.query('COMMIT');
    
    res.json({ success: true, message: 'Policy version published successfully' });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error publishing policy version:', error);
    res.status(500).json({ error: 'Failed to publish policy version' });
  } finally {
    client.release();
  }
});

// Clone policy version
router.post('/:id/clone', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const { version, language, title } = req.body;
    
    // Get original policy
    const originalResult = await client.query(
      'SELECT * FROM policy_versions WHERE id = $1',
      [id]
    );
    
    if (originalResult.rows.length === 0) {
      return res.status(404).json({ error: 'Original policy version not found' });
    }
    
    const original = originalResult.rows[0];
    
    // Check for duplicate version
    const duplicateCheck = await client.query(
      `SELECT id FROM policy_versions 
       WHERE tenant_id = $1 AND kind = $2 AND version = $3 AND language = $4
       LIMIT 1`,
      [original.tenant_id, original.kind, version, language || original.language]
    );
    
    if (duplicateCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ 
        error: 'Version already exists',
        message: `Version ${version} already exists for this policy`
      });
    }
    
    // Create cloned version
    const insertQuery = `
      INSERT INTO policy_versions (
        tenant_id, kind, version, title, content, language, 
        audience, user_type, is_active, file_name, file_path, 
        file_size, mime_type, effective_from, effective_to,
        is_mandatory, allow_reject, grace_days, enforce_mode,
        reconsent_trigger, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, NOW(), NOW())
      RETURNING *
    `;
    
    const values = [
      original.tenant_id,
      original.kind,
      version,
      title || original.title + ' (Clone)',
      original.content,
      language || original.language,
      original.audience,
      original.user_type,
      false, // is_active - cloned versions start as inactive
      original.file_name,
      original.file_path,
      original.file_size,
      original.mime_type,
      new Date().toISOString(), // effective_from - set to now for clones
      original.effective_to,
      original.is_mandatory,
      original.allow_reject,
      original.grace_days,
      original.enforce_mode,
      original.reconsent_trigger
    ];
    
    const result = await client.query(insertQuery, values);
    
    await client.query('COMMIT');
    
    res.json({ 
      success: true, 
      policy: result.rows[0],
      message: 'Policy version cloned successfully'
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error cloning policy version:', error);
    res.status(500).json({ error: 'Failed to clone policy version' });
  } finally {
    client.release();
  }
});

// Delete policy version
router.delete('/policy/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get file path before deletion
    const fileResult = await pool.query(
      'SELECT file_path FROM consent_versions WHERE id = $1',
      [id]
    );
    
    // Delete from database
    await pool.query('DELETE FROM consent_versions WHERE id = $1', [id]);
    
    // Delete file if exists
    if (fileResult.rows[0]?.file_path) {
      try {
        await fs.unlink(fileResult.rows[0].file_path);
      } catch (err) {
        console.error('Error deleting file:', err);
      }
    }
    
    res.json({ success: true, message: 'Policy version deleted successfully' });
    
  } catch (error) {
    console.error('Error deleting policy version:', error);
    res.status(500).json({ error: 'Failed to delete policy version' });
  }
});

// Get policy statistics
router.get('/policy/stats', async (req, res) => {
  try {
    const stats = {};
    
    // Total policies
    const policiesResult = await pool.query(
      'SELECT COUNT(*) as count FROM consent_versions'
    );
    stats.totalPolicies = parseInt(policiesResult.rows[0].count);
    
    // Total acceptances
    const acceptancesResult = await pool.query(
      'SELECT COUNT(*) as count FROM user_consents'
    );
    stats.totalAcceptances = parseInt(acceptancesResult.rows[0].count);
    
    // Active tenants
    const tenantsResult = await pool.query(
      'SELECT COUNT(DISTINCT tenant_id) as count FROM consent_versions WHERE is_active = true'
    );
    stats.activeTenants = parseInt(tenantsResult.rows[0].count);
    
    // Acceptance by audience
    const audienceResult = await pool.query(`
      SELECT audience, COUNT(*) as count 
      FROM user_consents 
      GROUP BY audience
    `);
    stats.byAudience = audienceResult.rows;
    
    // Acceptance by language
    const languageResult = await pool.query(`
      SELECT lang as language, COUNT(*) as count 
      FROM user_consents 
      GROUP BY lang
    `);
    stats.byLanguage = languageResult.rows;
    
    res.json(stats);
    
  } catch (error) {
    console.error('Error fetching policy stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Export consent records
router.get('/consent/export', async (req, res) => {
  try {
    const { format = 'json', startDate, endDate, tenant, audience } = req.query;
    
    let query = `
      SELECT 
        uc.consent_ref as "Consent ID",
        uc.title as "Title",
        uc.first_name as "First Name",
        uc.last_name as "Last Name",
        uc.id_last4 as "ID Last 4",
        uc.accepted_at as "Date",
        uc.audience as "Audience",
        uc.lang as "Language",
        uc.ip_addr as "IP Address",
        uc.user_agent as "Browser",
        t.name as "Tenant",
        cv.version as "Policy Version"
      FROM user_consents uc
      LEFT JOIN tenants t ON uc.tenant_id = t.id
      LEFT JOIN consent_versions cv ON uc.policy_version_id = cv.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;
    
    if (startDate) {
      query += ` AND uc.accepted_at >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }
    
    if (endDate) {
      query += ` AND uc.accepted_at <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }
    
    if (tenant) {
      query += ` AND t.code = $${paramIndex}`;
      params.push(tenant);
      paramIndex++;
    }
    
    if (audience) {
      query += ` AND uc.audience = $${paramIndex}`;
      params.push(audience);
      paramIndex++;
    }
    
    query += ' ORDER BY uc.accepted_at DESC';
    
    const result = await pool.query(query, params);
    
    if (format === 'csv') {
      // Convert to CSV
      const headers = Object.keys(result.rows[0] || {});
      const csv = [
        headers.join(','),
        ...result.rows.map(row => 
          headers.map(header => 
            JSON.stringify(row[header] || '')
          ).join(',')
        )
      ].join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="consent-export.csv"');
      res.send(csv);
    } else {
      res.json(result.rows);
    }
    
  } catch (error) {
    console.error('Error exporting consent records:', error);
    res.status(500).json({ error: 'Failed to export consent records' });
  }
});

// View audit snapshot
router.get('/consent/audit/:consentRef', async (req, res) => {
  try {
    const { consentRef } = req.params;
    
    const result = await pool.query(
      `SELECT 
        uc.*,
        t.name as tenant_name,
        cv.version as policy_version,
        cv.title as policy_title
       FROM user_consents uc
       LEFT JOIN tenants t ON uc.tenant_id = t.id
       LEFT JOIN consent_versions cv ON uc.policy_version_id = cv.id
       WHERE uc.consent_ref = $1`,
      [consentRef]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Consent record not found' });
    }
    
    res.json(result.rows[0]);
    
  } catch (error) {
    console.error('Error fetching audit snapshot:', error);
    res.status(500).json({ error: 'Failed to fetch audit snapshot' });
  }
});

module.exports = router;
