const { Pool } = require('pg');
const axios = require('axios');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'consent',
  user: 'postgres',
  password: '4321'
});

async function testCustomerFlow() {
  try {
    console.log('🔍 ทดสอบ Customer Flow...\n');
    
    // 1. ตรวจสอบ policies ที่มีอยู่
    console.log('📋 Policies ในฐานข้อมูล:');
    const policies = await pool.query(`
      SELECT id, user_type, language, title, 
             LEFT(content, 100) as content_preview
      FROM policy_versions
      WHERE is_active = true
      ORDER BY user_type, language
    `);
    
    policies.rows.forEach(p => {
      console.log(`[${p.id}] ${p.user_type} | ${p.language} | ${p.title}`);
      console.log(`     Content: ${p.content_preview.substring(0, 50)}...`);
    });
    
    // 2. ทดสอบ API สำหรับ customer Thai
    console.log('\n🌐 ทดสอบ Customer Thai:');
    try {
      const thaiRes = await axios.get(
        'http://localhost:3000/api/simple-policy/active?userType=customer&language=th-TH'
      );
      if (thaiRes.data.success && thaiRes.data.data) {
        console.log(`✅ Title: ${thaiRes.data.data.title}`);
        console.log(`   Content: ${thaiRes.data.data.content.substring(0, 100)}...`);
      } else {
        console.log('❌ ไม่พบ policy');
      }
    } catch (e) {
      console.log('❌ Error:', e.message);
    }
    
    // 3. ทดสอบ API สำหรับ customer English
    console.log('\n🌐 ทดสอบ Customer English:');
    try {
      const enRes = await axios.get(
        'http://localhost:3000/api/simple-policy/active?userType=customer&language=en-US'
      );
      if (enRes.data.success && enRes.data.data) {
        console.log(`✅ Title: ${enRes.data.data.title}`);
        console.log(`   Content: ${enRes.data.data.content.substring(0, 100)}...`);
      } else {
        console.log('❌ ไม่พบ policy');
      }
    } catch (e) {
      console.log('❌ Error:', e.message);
    }
    
    console.log('\n📌 Flow ที่ถูกต้อง:');
    console.log('==================');
    console.log('1. Customer เข้า /consent/select-language');
    console.log('2. เลือกภาษาไทย → ไปที่ /consent/customer?lang=th');
    console.log('   → API เรียก userType=customer&language=th-TH');
    console.log('   → แสดงเนื้อหาที่สร้างไว้สำหรับ customer ภาษาไทย');
    console.log('3. เลือก English → ไปที่ /consent/customer?lang=en');
    console.log('   → API เรียก userType=customer&language=en-US');
    console.log('   → แสดงเนื้อหาที่สร้างไว้สำหรับ customer ภาษาอังกฤษ');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

testCustomerFlow();
