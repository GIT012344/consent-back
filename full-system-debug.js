const { Pool } = require('pg');
const axios = require('axios');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'consent',
  user: 'postgres',
  password: '4321'
});

async function fullSystemDebug() {
  try {
    console.log('🔍 ตรวจสอบระบบทั้งหมดอย่างละเอียด...\n');
    
    // 1. ตรวจสอบข้อมูลในฐานข้อมูล
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('1. ข้อมูลในฐานข้อมูล');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const dbData = await pool.query(`
      SELECT * FROM policy_versions
      ORDER BY id DESC
    `);
    
    console.log(`พบ ${dbData.rows.length} policies:\n`);
    
    dbData.rows.forEach(p => {
      console.log(`ID: ${p.id} | Version: ${p.version}`);
      console.log(`UserType: "${p.user_type}"`);
      console.log(`Language: ${p.language}`);
      console.log(`Title: ${p.title}`);
      console.log(`Content ทั้งหมด:`);
      console.log('------------------------');
      console.log(p.content);
      console.log('------------------------\n');
    });
    
    // 2. ทดสอบ Backend API
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('2. ทดสอบ Backend API');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const testCases = [
      { userType: 'customer', language: 'th-TH', desc: 'Customer Thai' },
      { userType: 'customer', language: 'en-US', desc: 'Customer English' },
      { userType: 'employee', language: 'th-TH', desc: 'Employee Thai' },
      { userType: 'partner', language: 'th-TH', desc: 'Partner Thai' }
    ];
    
    for (const test of testCases) {
      console.log(`\nTest: ${test.desc}`);
      console.log(`URL: /api/simple-policy/active?userType=${test.userType}&language=${test.language}`);
      
      try {
        const res = await axios.get(
          `http://localhost:3000/api/simple-policy/active?userType=${test.userType}&language=${test.language}`
        );
        
        if (res.data.success && res.data.data) {
          console.log(`✅ Response:`);
          console.log(`   ID: ${res.data.data.id}`);
          console.log(`   Title: ${res.data.data.title}`);
          console.log(`   UserType: ${res.data.data.user_type}`);
          console.log(`   Content:`);
          console.log('   ------------------------');
          console.log(`   ${res.data.data.content}`);
          console.log('   ------------------------');
        } else {
          console.log('❌ ไม่พบข้อมูล');
        }
      } catch (e) {
        console.log(`❌ Error: ${e.message}`);
      }
    }
    
    // 3. ตรวจสอบ Frontend URLs
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('3. Frontend URLs ที่ควรแสดงเนื้อหา');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    dbData.rows.forEach(p => {
      let url = '';
      if (p.user_type === 'customer') {
        if (p.language === 'th-TH') {
          url = 'http://localhost:3003/consent/select-language → เลือก "ภาษาไทย"';
        } else if (p.language === 'en-US') {
          url = 'http://localhost:3003/consent/select-language → เลือก "English"';
        }
      } else {
        const lang = p.language === 'th-TH' ? 'th' : 'en';
        url = `http://localhost:3003/consent/${p.user_type}?lang=${lang}`;
      }
      
      console.log(`[${p.version}] ${p.title}`);
      console.log(`URL: ${url}`);
      console.log(`ควรแสดง: "${p.content.substring(0, 100)}..."`);
      console.log('');
    });
    
    // 4. วิเคราะห์ปัญหา
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('4. วิเคราะห์ปัญหา');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    if (dbData.rows.length === 0) {
      console.log('❌ ไม่มี policies ในฐานข้อมูล!');
      console.log('💡 แก้ไข: สร้าง policy ใหม่ที่ http://localhost:3003/admin/create-policy');
    } else {
      console.log('✅ มี policies ในฐานข้อมูล');
      console.log('📌 ตรวจสอบ:');
      console.log('   1. Backend ทำงานที่ port 3000');
      console.log('   2. Frontend เรียก API ถูกต้อง');
      console.log('   3. เนื้อหาที่แสดงตรงกับในฐานข้อมูล');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

fullSystemDebug();
