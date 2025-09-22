const { Pool } = require('pg');
const axios = require('axios');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '4321',
  database: 'consent'
});

async function traceAdminContent() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 ติดตามเนื้อหาที่ Admin สร้าง\n');
    console.log('='.repeat(80));
    
    // 1. ดูเนื้อหาล่าสุดในฐานข้อมูล
    console.log('1️⃣ เนื้อหาล่าสุดในฐานข้อมูล:\n');
    const latest = await client.query(`
      SELECT id, user_type, language, title, content
      FROM policy_versions
      WHERE is_active = true
      ORDER BY updated_at DESC, created_at DESC
      LIMIT 5
    `);
    
    latest.rows.forEach(p => {
      console.log(`📄 ${p.title} (${p.user_type}/${p.language}) - ID: ${p.id}`);
      console.log('เนื้อหา:');
      console.log(p.content);
      console.log('-'.repeat(60) + '\n');
    });
    
    // 2. ทดสอบ API endpoint
    console.log('2️⃣ ทดสอบ API Endpoint:\n');
    
    const tests = [
      { userType: 'customer', language: 'th', desc: 'ลูกค้าไทย' },
      { userType: 'customer', language: 'en', desc: 'ลูกค้าอังกฤษ' },
      { userType: 'employee', language: 'th', desc: 'พนักงานไทย' }
    ];
    
    for (const test of tests) {
      const url = `http://localhost:3000/api/simple-policy/active?userType=${test.userType}&language=${test.language}`;
      console.log(`Testing: ${test.desc}`);
      console.log(`URL: ${url}`);
      
      try {
        const res = await axios.get(url);
        if (res.data.success && res.data.data) {
          console.log(`✅ Title: "${res.data.data.title}"`);
          console.log(`   Content: ${res.data.data.content?.substring(0, 100)}...`);
        } else {
          console.log(`❌ No data returned`);
        }
      } catch (err) {
        console.log(`❌ Error: ${err.message}`);
      }
      console.log('');
    }
    
    // 3. แสดงวิธีแก้ไข
    console.log('='.repeat(80));
    console.log('\n✅ วิธีให้เนื้อหาแสดงตามที่ Admin สร้าง:\n');
    console.log('1. ไปที่ http://localhost:5000/admin/create-policy');
    console.log('2. สร้าง Policy ใหม่:');
    console.log('   - Title: ใส่ชื่อที่ต้องการ (เช่น 001, 002, 003)');
    console.log('   - User Type: เลือก customer/employee/partner');
    console.log('   - Language: เลือก th หรือ en');
    console.log('   - Content: ใส่เนื้อหาที่ต้องการ');
    console.log('3. กด Save');
    console.log('4. ระบบจะอัพเดทเนื้อหาเดิมถ้า title ซ้ำ');
    console.log('5. ทดสอบที่ http://localhost:5000/consent/[userType]?lang=[language]');
    console.log('\nหมายเหตุ: ถ้าสร้าง title ซ้ำ จะอัพเดทเนื้อหาใหม่ทับของเดิม');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

traceAdminContent();
