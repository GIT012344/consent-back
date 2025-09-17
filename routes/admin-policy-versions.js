const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /api/admin/policy-versions - List all policy versions
router.get('/admin/policy-versions', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { tenant, kind, audience, language, is_published } = req.query;
    
    let query = `
      SELECT 
        pv.*,
        t.name as tenant_name,
        t.code as tenant_code,
        pk.name as kind_name,
        pk.code as kind_code,
        ARRAY_AGG(DISTINCT a.code) as audiences
      FROM policy_versions pv
      JOIN policies p ON pv.policy_id = p.id
      JOIN tenants t ON p.tenant_id = t.id
      JOIN policy_kinds pk ON p.kind_id = pk.id
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
      query += ` AND pk.code = $${paramIndex++}`;
      params.push(kind);
    }
    
    if (language) {
      query += ` AND pv.language = $${paramIndex++}`;
      params.push(language);
    }
    
    if (is_published !== undefined) {
      query += ` AND pv.is_published = $${paramIndex++}`;
      params.push(is_published === 'true');
    }
    
    query += `
      GROUP BY pv.id, t.name, t.code, pk.name, pk.code
      ORDER BY pv.created_at DESC
    `;
    
    const result = await client.query(query, params);
    
    // Filter by audience if specified
    let versions = result.rows;
    if (audience) {
      versions = versions.filter(v => v.audiences && v.audiences.includes(audience));
    }
    
    res.json({
      success: true,
      data: versions
    });
    
  } catch (error) {
    console.error('Error fetching policy versions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch policy versions'
    });
  } finally {
    client.release();
  }
});

// POST /api/admin/policy-version - Create new policy version
router.post('/admin/policy-version', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const {
      tenant_code,
      kind,
      version,
      language,
      audiences,
      title,
      content,
      effective_from,
      effective_to,
      is_mandatory,
      grace_days,
      enforce_mode,
      is_published
    } = req.body;
    
    // Validate required fields
    if (!tenant_code || !kind || !version || !language || !title || !content) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }
    
    // Get or create tenant
    let tenantResult = await client.query(
      'SELECT id FROM tenants WHERE code = $1',
      [tenant_code]
    );
    
    if (tenantResult.rows.length === 0) {
      // Create tenant if not exists
      tenantResult = await client.query(
        `INSERT INTO tenants (code, name, is_active) 
         VALUES ($1, $2, true) 
         RETURNING id`,
        [tenant_code, tenant_code]
      );
    }
    
    const tenantId = tenantResult.rows[0].id;
    
    // Get or create policy kind
    let kindResult = await client.query(
      'SELECT id FROM policy_kinds WHERE code = $1',
      [kind]
    );
    
    if (kindResult.rows.length === 0) {
      kindResult = await client.query(
        `INSERT INTO policy_kinds (code, name) 
         VALUES ($1, $2) 
         RETURNING id`,
        [kind, kind.charAt(0).toUpperCase() + kind.slice(1)]
      );
    }
    
    const kindId = kindResult.rows[0].id;
    
    // Get or create policy
    let policyResult = await client.query(
      'SELECT id FROM policies WHERE tenant_id = $1 AND kind_id = $2',
      [tenantId, kindId]
    );
    
    if (policyResult.rows.length === 0) {
      policyResult = await client.query(
        `INSERT INTO policies (tenant_id, kind_id) 
         VALUES ($1, $2) 
         RETURNING id`,
        [tenantId, kindId]
      );
    }
    
    const policyId = policyResult.rows[0].id;
    
    // Check for duplicate version
    const versionCheck = await client.query(
      `SELECT id FROM policy_versions 
       WHERE policy_id = $1 AND version = $2 AND language = $3`,
      [policyId, version, language]
    );
    
    if (versionCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        error: 'Version already exists for this language'
      });
    }
    
    // Insert policy version
    const versionResult = await client.query(
      `INSERT INTO policy_versions (
        policy_id, version, language, title, content,
        effective_from, effective_to, is_mandatory, grace_days,
        enforce_mode, is_published, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
      RETURNING id`,
      [
        policyId, version, language, title, content,
        effective_from || new Date(), effective_to, 
        is_mandatory !== false, grace_days || 0,
        enforce_mode || 'action_gate', is_published || false
      ]
    );
    
    const versionId = versionResult.rows[0].id;
    
    // Handle audiences
    if (audiences && audiences.length > 0) {
      for (const audienceCode of audiences) {
        // Get or create audience
        let audienceResult = await client.query(
          'SELECT id FROM audiences WHERE tenant_id = $1 AND code = $2',
          [tenantId, audienceCode]
        );
        
        if (audienceResult.rows.length === 0) {
          audienceResult = await client.query(
            `INSERT INTO audiences (tenant_id, code, name) 
             VALUES ($1, $2, $3) 
             RETURNING id`,
            [tenantId, audienceCode, audienceCode.charAt(0).toUpperCase() + audienceCode.slice(1)]
          );
        }
        
        // Link audience to version
        await client.query(
          `INSERT INTO policy_version_audiences (policy_version_id, audience_id) 
           VALUES ($1, $2)`,
          [versionId, audienceResult.rows[0].id]
        );
      }
    }
    
    await client.query('COMMIT');
    
    res.status(201).json({
      success: true,
      data: {
        id: versionId,
        message: 'Policy version created successfully'
      }
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

// PUT /api/admin/policy-version/:id - Update policy version
router.put('/admin/policy-version/:id', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const updates = req.body;
    
    // Build update query dynamically
    const updateFields = [];
    const params = [id];
    let paramIndex = 2;
    
    const allowedFields = [
      'title', 'content', 'effective_from', 'effective_to',
      'is_mandatory', 'grace_days', 'enforce_mode', 'is_published'
    ];
    
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateFields.push(`${field} = $${paramIndex++}`);
        params.push(updates[field]);
      }
    }
    
    if (updateFields.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update'
      });
    }
    
    const updateQuery = `
      UPDATE policy_versions 
      SET ${updateFields.join(', ')}, updated_at = NOW()
      WHERE id = $1
      RETURNING id
    `;
    
    const result = await client.query(updateQuery, params);
    
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: 'Policy version not found'
      });
    }
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      data: {
        id: result.rows[0].id,
        message: 'Policy version updated successfully'
      }
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating policy version:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update policy version'
    });
  } finally {
    client.release();
  }
});

// DELETE /api/admin/policy-version/:id - Delete policy version
router.delete('/admin/policy-version/:id', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    
    // Check if version has consents
    const consentCheck = await client.query(
      'SELECT COUNT(*) as count FROM user_consents WHERE policy_version_id = $1',
      [id]
    );
    
    if (parseInt(consentCheck.rows[0].count) > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'Cannot delete version with existing consents'
      });
    }
    
    // Delete audience associations
    await client.query(
      'DELETE FROM policy_version_audiences WHERE policy_version_id = $1',
      [id]
    );
    
    // Delete version
    const result = await client.query(
      'DELETE FROM policy_versions WHERE id = $1 RETURNING id',
      [id]
    );
    
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: 'Policy version not found'
      });
    }
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      message: 'Policy version deleted successfully'
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting policy version:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete policy version'
    });
  } finally {
    client.release();
  }
});

module.exports = router;
