const { Pool } = require('pg');
const axios = require('axios');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '4321',
  database: 'consent'
});

async function testAndVerify() {
  console.log('🔍 ตรวจสอบระบบทั้งหมด\n');
  console.log('='.repeat(50));
  
  try {
    // 1. Database Check
    console.log('\n1. ตรวจสอบ Database:');
    const client = await pool.connect();
    
    const policies = await client.query(`
      SELECT id, user_type, language, title, 
             LEFT(content, 100) as content_preview
      FROM policy_versions
      WHERE is_active = true AND user_type = 'customer'
      ORDER BY language
    `);
    
    if (policies.rows.length === 0) {
      console.log('   ❌ ไม่พบ Policy ในฐานข้อมูล');
    } else {
      policies.rows.forEach(p => {
        console.log(`   ✅ ${p.language === 'th' ? 'ภาษาไทย' : 'English'}: "${p.title}"`);
        console.log(`      เนื้อหา: ${p.content_preview}`);
      });
    }
    
    client.release();
    
    // 2. API Test
    console.log('\n2. ทดสอบ API:');
    
    // Test Thai
    try {
      const thRes = await axios.get('http://localhost:3000/api/simple-policy/active?userType=customer&language=th');
      if (thRes.data.success) {
        console.log(`   ✅ Thai API: "${thRes.data.data.title}"`);
      } else {
        console.log('   ❌ Thai API: ไม่พบข้อมูล');
      }
    } catch (err) {
      console.log(`   ❌ Thai API Error: ${err.message}`);
    }
    
    // Test English
    try {
      const enRes = await axios.get('http://localhost:3000/api/simple-policy/active?userType=customer&language=en');
      if (enRes.data.success) {
        console.log(`   ✅ English API: "${enRes.data.data.title}"`);
      } else {
        console.log('   ❌ English API: ไม่พบข้อมูล');
      }
    } catch (err) {
      console.log(`   ❌ English API Error: ${err.message}`);
    }
    
    // 3. Summary
    console.log('\n' + '='.repeat(50));
    console.log('📋 สรุป:');
    console.log('\nลิงค์ทดสอบ (Port 5000):');
    console.log('✅ ภาษาไทย: http://localhost:5000/consent/customer?lang=th');
    console.log('✅ English: http://localhost:5000/consent/customer?lang=en');
    console.log('\nAdmin Panel:');
    console.log('✅ สร้าง Policy: http://localhost:5000/admin/create-policy');
    console.log('✅ จัดการ Policy: http://localhost:5000/admin/policies');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

testAndVerify();
