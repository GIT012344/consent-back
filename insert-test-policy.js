const pool = require('./db');

async function insertTestPolicy() {
  try {
    console.log('Inserting test policies...');
    
    // Check if policies exist
    const check = await pool.query('SELECT COUNT(*) FROM policy_versions');
    
    if (check.rows[0].count > 0) {
      console.log('Policies already exist:', check.rows[0].count);
    } else {
      // Insert test policies
      await pool.query(`
        INSERT INTO policy_versions (version, title, content, language, is_active, created_at)
        VALUES 
        ('1.0', 'นโยบายความเป็นส่วนตัว', 'เนื้อหานโยบายความเป็นส่วนตัว...', 'th-TH', true, NOW()),
        ('1.0', 'Privacy Policy', 'Privacy policy content...', 'en-US', true, NOW()),
        ('2.0', 'นโยบายคุกกี้', 'เนื้อหานโยบายคุกกี้...', 'th-TH', true, NOW())
      `);
      
      console.log('✅ Test policies inserted');
    }
    
    // Show all policies
    const policies = await pool.query('SELECT id, version, title, language, is_active FROM policy_versions');
    console.log('\nCurrent policies:');
    policies.rows.forEach(p => {
      console.log(`  - ${p.title} v${p.version} (${p.language}) - ${p.is_active ? 'Active' : 'Inactive'}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

insertTestPolicy();
