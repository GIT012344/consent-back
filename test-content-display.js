const { Pool } = require('pg');
const axios = require('axios');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'consent',
  user: 'postgres',
  password: '4321'
});

async function testContentDisplay() {
  try {
    console.log('🔍 ทดสอบการแสดงเนื้อหา...\n');
    
    // 1. ดูเนื้อหาในฐานข้อมูล
    console.log('📋 เนื้อหาในฐานข้อมูล:');
    console.log('========================');
    const dbData = await pool.query(`
      SELECT version, user_type, language, title, content
      FROM policy_versions
      ORDER BY version
    `);
    
    dbData.rows.forEach(p => {
      console.log(`\n[${p.version}] ${p.user_type} - ${p.language}`);
      console.log(`Title: ${p.title}`);
      console.log(`Content: ${p.content.substring(0, 200)}...`);
    });
    
    // 2. ทดสอบ API endpoint สำหรับแต่ละ userType
    console.log('\n\n🌐 ทดสอบ API Endpoints:');
    console.log('========================');
    
    // Test Customer Thai
    console.log('\n1. Customer Thai:');
    try {
      const res = await axios.get('http://localhost:3000/api/simple-policy/active?userType=customer&language=th-TH');
      if (res.data.success && res.data.data) {
        console.log(`✅ Title: ${res.data.data.title}`);
        console.log(`   Content: ${res.data.data.content.substring(0, 100)}...`);
      } else {
        console.log('❌ ไม่พบข้อมูล');
      }
    } catch (e) {
      console.log('❌ Error:', e.message);
    }
    
    // Test Customer English
    console.log('\n2. Customer English:');
    try {
      const res = await axios.get('http://localhost:3000/api/simple-policy/active?userType=customer&language=en-US');
      if (res.data.success && res.data.data) {
        console.log(`✅ Title: ${res.data.data.title}`);
        console.log(`   Content: ${res.data.data.content.substring(0, 100)}...`);
      } else {
        console.log('❌ ไม่พบข้อมูล');
      }
    } catch (e) {
      console.log('❌ Error:', e.message);
    }
    
    // Test Employee
    console.log('\n3. Employee Thai:');
    try {
      const res = await axios.get('http://localhost:3000/api/simple-policy/active?userType=employee&language=th-TH');
      if (res.data.success && res.data.data) {
        console.log(`✅ Title: ${res.data.data.title}`);
        console.log(`   Content: ${res.data.data.content.substring(0, 100)}...`);
      } else {
        console.log('❌ ไม่พบข้อมูล');
      }
    } catch (e) {
      console.log('❌ Error:', e.message);
    }
    
    // Test Partner
    console.log('\n4. Partner Thai:');
    try {
      const res = await axios.get('http://localhost:3000/api/simple-policy/active?userType=partner&language=th-TH');
      if (res.data.success && res.data.data) {
        console.log(`✅ Title: ${res.data.data.title}`);
        console.log(`   Content: ${res.data.data.content.substring(0, 100)}...`);
      } else {
        console.log('❌ ไม่พบข้อมูล');
      }
    } catch (e) {
      console.log('❌ Error:', e.message);
    }
    
    console.log('\n\n📌 URLs ที่ต้องทดสอบ:');
    console.log('====================');
    console.log('1. Customer: http://localhost:3003/consent/select-language');
    console.log('   - เลือกไทย → ควรแสดงเนื้อหา version 001');
    console.log('   - เลือก English → ควรแสดงเนื้อหา version 002');
    console.log('2. Employee: http://localhost:3003/consent/employee?lang=th');
    console.log('   - ควรแสดงเนื้อหา version 003');
    console.log('3. Partner: http://localhost:3003/consent/partner?lang=th');
    console.log('   - ควรแสดงเนื้อหา version 004');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

testContentDisplay();
