const { Pool } = require('pg');
const axios = require('axios');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'consent',
  user: 'postgres',
  password: '4321'
});

async function testPolicyCreation() {
  try {
    console.log('=== TESTING POLICY CREATION ===\n');
    
    // 1. Check current policies in database
    const beforeCount = await pool.query('SELECT COUNT(*) FROM policy_versions');
    console.log(`📊 Policies before: ${beforeCount.rows[0].count}`);
    
    // 2. Create a test policy via API
    const testPolicy = {
      user_type: 'contractor',
      language: 'th-TH',
      version: '1.0.0',
      title: 'ตัวอย่างการแสดงผล',
      content: `<h2>พ้า</h2>
<p>ไดัวไพอพ้าไพ่วไ</p>
<p>พ</p>
<p>ไวพไว</p>
<p>พไวพ</p>
<p>ไวพไว</p>
<h3>ตัวไดัวไดไวดไวดไวด</h3>
<ul>
  <li>ไกดัวไดไวดไว</li>
  <li>ดัวไ</li>
  <li>ดไว</li>
  <li>ดไว</li>
  <li>ดไ</li>
  <li>ดไ</li>
  <li>ดัวไ</li>
</ul>
<p>ตัวไดไวดไว</p>
<p>ไวพพดัวไพดัวไพดัวไ</p>`,
      is_mandatory: true,
      enforce_mode: 'strict'
    };
    
    console.log('\n📝 Creating test policy...');
    const response = await axios.post('http://localhost:3000/api/simple-policy', testPolicy);
    
    if (response.data.success) {
      console.log('✅ Policy created successfully!');
      console.log('Response:', response.data);
    }
    
    // 3. Check if policy was saved to database
    const afterCount = await pool.query('SELECT COUNT(*) FROM policy_versions');
    console.log(`\n📊 Policies after: ${afterCount.rows[0].count}`);
    
    // 4. Get the latest policy
    const latestPolicy = await pool.query(`
      SELECT id, user_type, language, version, title, 
             LEFT(content, 100) as content_preview, is_active
      FROM policy_versions 
      ORDER BY id DESC 
      LIMIT 1
    `);
    
    if (latestPolicy.rows.length > 0) {
      console.log('\n📋 Latest policy:');
      const p = latestPolicy.rows[0];
      console.log(`  ID: ${p.id}`);
      console.log(`  Title: ${p.title}`);
      console.log(`  Version: ${p.version}`);
      console.log(`  Language: ${p.language}`);
      console.log(`  Content preview: ${p.content_preview}...`);
      console.log(`  Active: ${p.is_active}`);
    }
    
    // 5. Test fetching via API
    console.log('\n📡 Testing API fetch...');
    const fetchResponse = await axios.get('http://localhost:3000/api/policy-versions');
    console.log(`API returned ${fetchResponse.data.data?.length || 0} policies`);
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  } finally {
    await pool.end();
  }
}

testPolicyCreation();
