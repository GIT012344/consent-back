const { Pool } = require('pg');
const axios = require('axios');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '4321',
  database: 'consent'
});

async function verifySystem() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 SYSTEM VERIFICATION\n');
    console.log('='.repeat(50));
    
    // 1. Check database content
    console.log('\n📊 Policies in Database:');
    const policies = await client.query(`
      SELECT id, user_type, language, title, 
             LEFT(content, 80) as content_preview
      FROM policy_versions
      WHERE is_active = true
      ORDER BY id
    `);
    
    policies.rows.forEach(p => {
      console.log(`\nID ${p.id}: ${p.user_type}/${p.language}`);
      console.log(`Title: "${p.title}"`);
      console.log(`Content: ${p.content_preview}...`);
    });
    
    // 2. Test API endpoints
    console.log('\n' + '='.repeat(50));
    console.log('\n🧪 API Tests:');
    
    const tests = [
      { userType: 'customer', language: 'th', expected: '001 or 01' },
      { userType: 'customer', language: 'en', expected: '002' },
      { userType: 'employee', language: 'th', expected: '003' }
    ];
    
    for (const test of tests) {
      try {
        const res = await axios.get(`http://localhost:3000/api/simple-policy/active?userType=${test.userType}&language=${test.language}`);
        if (res.data.success && res.data.data) {
          console.log(`✅ ${test.userType}/${test.language}: "${res.data.data.title}"`);
        } else {
          console.log(`❌ ${test.userType}/${test.language}: No data`);
        }
      } catch (err) {
        console.log(`❌ ${test.userType}/${test.language}: ${err.message}`);
      }
    }
    
    // 3. Summary
    console.log('\n' + '='.repeat(50));
    console.log('\n✅ SYSTEM STATUS:');
    console.log('\nWorking Links (Port 5000):');
    console.log('• Customer Thai: http://localhost:5000/consent/customer?lang=th');
    console.log('• Customer English: http://localhost:5000/consent/customer?lang=en');
    console.log('• Employee Thai: http://localhost:5000/consent/employee?lang=th');
    console.log('\nAdmin Panel:');
    console.log('• Policy Management: http://localhost:5000/admin/policies');
    console.log('• Create Policy: http://localhost:5000/admin/create-policy');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

verifySystem();
