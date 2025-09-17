const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'consent',
  user: 'postgres',
  password: '4321'
});

async function setupPolicyTable() {
  try {
    console.log('Setting up policy_versions table...\n');
    
    // Drop existing table if exists
    await pool.query('DROP TABLE IF EXISTS policy_versions CASCADE');
    console.log('✅ Dropped old table');
    
    // Create new table with correct structure
    await pool.query(`
      CREATE TABLE policy_versions (
        id SERIAL PRIMARY KEY,
        version VARCHAR(50),
        title VARCHAR(255),
        content TEXT,
        language VARCHAR(10),
        user_type VARCHAR(50),
        effective_date TIMESTAMP,
        expiry_date TIMESTAMP,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Created new policy_versions table');
    
    // Insert test data
    await pool.query(`
      INSERT INTO policy_versions (version, title, content, language, user_type, is_active)
      VALUES 
      ('1.0.0', 'นโยบายความเป็นส่วนตัว', '<h2>นโยบายความเป็นส่วนตัว</h2><p>เนื้อหานโยบาย...</p>', 'th-TH', 'customer', true),
      ('1.0.0', 'Privacy Policy', '<h2>Privacy Policy</h2><p>Policy content...</p>', 'en-US', 'customer', true)
    `);
    console.log('✅ Inserted test policies');
    
    // Verify
    const count = await pool.query('SELECT COUNT(*) FROM policy_versions');
    console.log(`\n✅ Total policies: ${count.rows[0].count}`);
    
    const policies = await pool.query('SELECT id, title, version, language, user_type FROM policy_versions');
    console.log('\nPolicies in database:');
    policies.rows.forEach(p => {
      console.log(`  - ${p.title} v${p.version} (${p.user_type}, ${p.language})`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

setupPolicyTable();
