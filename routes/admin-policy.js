const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

// GET /api/admin/tenants - Get all tenants
router.get('/admin/tenants', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, code, name FROM tenants ORDER BY name'
    );
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching tenants:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tenants'
    });
  }
});

// POST /api/admin/policy-version - Create new policy version
router.post('/admin/policy-version', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const {
      tenant,
      kind,
      version,
      title,
      language,
      audiences,
      content_html,
      is_mandatory,
      grace_days,
      enforce_mode,
      effective_from,
      effective_to
    } = req.body;
    
    await client.query('BEGIN');
    
    // Get or create tenant
    let tenantResult = await client.query(
      'SELECT id FROM tenants WHERE code = $1',
      [tenant]
    );
    
    let tenantId;
    if (tenantResult.rows.length === 0) {
      // Create tenant if not exists
      const createTenantResult = await client.query(
        `INSERT INTO tenants (code, name, audiences, default_language, created_at)
         VALUES ($1, $2, $3, $4, NOW())
         RETURNING id`,
        [tenant, tenant, JSON.stringify(['customer', 'employee', 'partner']), 'th']
      );
      tenantId = createTenantResult.rows[0].id;
    } else {
      tenantId = tenantResult.rows[0].id;
    }
    
    // Get or create policy kind
    let kindResult = await client.query(
      'SELECT id FROM policy_kinds WHERE code = $1',
      [kind]
    );
    
    let kindId;
    if (kindResult.rows.length === 0) {
      const createKindResult = await client.query(
        `INSERT INTO policy_kinds (code, name, created_at)
         VALUES ($1, $2, NOW())
         RETURNING id`,
        [kind, kind.charAt(0).toUpperCase() + kind.slice(1) + ' Policy']
      );
      kindId = createKindResult.rows[0].id;
    } else {
      kindId = kindResult.rows[0].id;
    }
    
    // Get or create policy
    let policyResult = await client.query(
      'SELECT id FROM policies WHERE tenant_id = $1 AND kind = $2',
      [tenantId, kind]
    );
    
    let policyId;
    if (policyResult.rows.length === 0) {
      const createPolicyResult = await client.query(
        `INSERT INTO policies (tenant_id, kind, name, created_at)
         VALUES ($1, $2, $3, NOW())
         RETURNING id`,
        [tenantId, kind, title]
      );
      policyId = createPolicyResult.rows[0].id;
    } else {
      policyId = policyResult.rows[0].id;
    }
    
    // Check if version already exists
    const versionCheck = await client.query(
      'SELECT id FROM policy_versions WHERE policy_id = $1 AND version = $2',
      [policyId, version]
    );
    
    if (versionCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'Version already exists for this policy'
      });
    }
    
    // Insert policy version
    const versionResult = await client.query(
      `INSERT INTO policy_versions (
        policy_id, version, title, content_html, language,
        is_mandatory, grace_days, enforce_mode,
        effective_from, effective_to, is_active,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true, NOW(), NOW())
      RETURNING id`,
      [
        policyId, version, title, content_html, language,
        is_mandatory, grace_days || 0, enforce_mode || 'action_gate',
        effective_from, effective_to
      ]
    );
    
    const versionId = versionResult.rows[0].id;
    
    // Add audience associations
    for (const audienceCode of audiences) {
      // Get or create audience
      let audienceResult = await client.query(
        'SELECT id FROM audiences WHERE code = $1',
        [audienceCode]
      );
      
      let audienceId;
      if (audienceResult.rows.length === 0) {
        const createAudienceResult = await client.query(
          `INSERT INTO audiences (code, name, created_at)
           VALUES ($1, $2, NOW())
           RETURNING id`,
          [audienceCode, audienceCode.charAt(0).toUpperCase() + audienceCode.slice(1)]
        );
        audienceId = createAudienceResult.rows[0].id;
      } else {
        audienceId = audienceResult.rows[0].id;
      }
      
      // Create association
      await client.query(
        `INSERT INTO policy_version_audiences (policy_version_id, audience_id, created_at)
         VALUES ($1, $2, NOW())`,
        [versionId, audienceId]
      );
    }
    
    // Log audit event
    await client.query(
      `INSERT INTO audit_logs (
        tenant_id, entity_type, entity_id, action, 
        details, created_at
      ) VALUES ($1, 'policy_version', $2, 'create', $3, NOW())`,
      [
        tenantId,
        versionId,
        JSON.stringify({ version, title, audiences, language })
      ]
    );
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      policy_version_id: versionId,
      message: 'Policy version created successfully'
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating policy version:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create policy version'
    });
  } finally {
    client.release();
  }
});

// GET /api/admin/policy-versions - Get all policy versions
router.get('/admin/policy-versions', async (req, res) => {
  try {
    const { tenant, kind, active } = req.query;
    
    let query = `
      SELECT 
        pv.id,
        pv.version,
        pv.title,
        pv.language,
        pv.is_mandatory,
        pv.grace_days,
        pv.enforce_mode,
        pv.is_active,
        pv.effective_from,
        pv.effective_to,
        pv.created_at,
        p.kind,
        t.code as tenant_code,
        t.name as tenant_name,
        array_agg(a.code) as audiences
      FROM policy_versions pv
      JOIN policies p ON pv.policy_id = p.id
      JOIN tenants t ON p.tenant_id = t.id
      LEFT JOIN policy_version_audiences pva ON pv.id = pva.policy_version_id
      LEFT JOIN audiences a ON pva.audience_id = a.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;
    
    if (tenant) {
      query += ` AND t.code = $${paramIndex++}`;
      params.push(tenant);
    }
    
    if (kind) {
      query += ` AND p.kind = $${paramIndex++}`;
      params.push(kind);
    }
    
    if (active === 'true') {
      query += ' AND pv.is_active = true';
    }
    
    query += `
      GROUP BY pv.id, p.kind, t.code, t.name
      ORDER BY pv.created_at DESC
    `;
    
    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      data: result.rows
    });
    
  } catch (error) {
    console.error('Error fetching policy versions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch policy versions'
    });
  }
});

// PUT /api/admin/policy-version/:id/toggle - Toggle policy version active status
router.put('/admin/policy-version/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      `UPDATE policy_versions 
       SET is_active = NOT is_active, updated_at = NOW()
       WHERE id = $1
       RETURNING is_active`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Policy version not found'
      });
    }
    
    res.json({
      success: true,
      is_active: result.rows[0].is_active
    });
    
  } catch (error) {
    console.error('Error toggling policy version:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to toggle policy version'
    });
  }
});

module.exports = router;
