const pool = require('./db');

async function testPolicyAPI() {
  try {
    console.log('=== TESTING POLICY API ===\n');
    
    // 1. Check if policy_versions table exists and has data
    const policies = await pool.query('SELECT * FROM policy_versions ORDER BY id DESC LIMIT 5');
    console.log('📊 Policy versions in database:', policies.rows.length);
    
    if (policies.rows.length > 0) {
      console.log('\nSample data:');
      policies.rows.forEach(p => {
        console.log(`  - ID ${p.id}: ${p.title || p.version_name} (v${p.version}) - ${p.language || 'no lang'}`);
      });
    } else {
      console.log('❌ No policies in database!');
      console.log('\nInserting test policy...');
      
      // Insert a test policy
      await pool.query(`
        INSERT INTO policy_versions (version, title, content, language, is_active, created_at)
        VALUES ('1.0', 'นโยบายความเป็นส่วนตัว', 'เนื้อหานโยบาย...', 'th', true, NOW())
      `);
      
      console.log('✅ Test policy inserted');
    }
    
    // 2. Test API endpoint
    const http = require('http');
    
    console.log('\n📡 Testing /api/policy-versions...');
    http.get('http://localhost:3000/api/policy-versions', res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          console.log('API Response:', json);
          pool.end();
        } catch (e) {
          console.log('Response:', data);
          pool.end();
        }
      });
    }).on('error', err => {
      console.error('API Error:', err.message);
      pool.end();
    });
    
  } catch (error) {
    console.error('Error:', error.message);
    pool.end();
  }
}

testPolicyAPI();
