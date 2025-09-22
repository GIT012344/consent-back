const { Pool } = require('pg');
const axios = require('axios');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '4321',
  database: 'consent'
});

async function verifyFinalFix() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 ตรวจสอบการแก้ไขครั้งสุดท้าย\n');
    console.log('='.repeat(80));
    
    // 1. ดูว่ามี policy อะไรบ้างในฐานข้อมูล
    console.log('1. Policies ในฐานข้อมูล:\n');
    const policies = await client.query(`
      SELECT id, user_type, language, title, content, is_active
      FROM policy_versions
      WHERE is_active = true
      ORDER BY user_type, language
    `);
    
    if (policies.rows.length === 0) {
      console.log('❌ ไม่มี policy ในฐานข้อมูล');
    } else {
      policies.rows.forEach(p => {
        console.log(`ID ${p.id}: ${p.user_type}/${p.language} = "${p.title}"`);
        console.log(`Content: ${p.content.substring(0, 100)}...`);
        console.log('---');
      });
    }
    
    // 2. ทดสอบ API
    console.log('\n2. ทดสอบ API:\n');
    try {
      const res = await axios.get('http://localhost:3000/api/simple-policy/active?userType=customer&language=th');
      console.log('API Response:');
      console.log(`Success: ${res.data.success}`);
      if (res.data.data) {
        console.log(`Title: ${res.data.data.title}`);
        console.log(`Content: ${res.data.data.content?.substring(0, 100)}...`);
      } else {
        console.log('Message:', res.data.message);
      }
    } catch (err) {
      console.log('API Error:', err.message);
    }
    
    console.log('\n✅ ทดสอบที่: http://localhost:5000/consent/customer?lang=th');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

verifyFinalFix();
