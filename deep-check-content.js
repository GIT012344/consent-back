const { Pool } = require('pg');
const axios = require('axios');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '4321',
  database: 'consent'
});

async function deepCheckContent() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 ตรวจสอบระบบทั้งหมดอย่างละเอียด\n');
    console.log('='.repeat(80));
    
    // 1. ตรวจสอบเนื้อหาในฐานข้อมูล
    console.log('1️⃣ เนื้อหาจริงในฐานข้อมูล:\n');
    const dbContent = await client.query(`
      SELECT id, user_type, language, title, content
      FROM policy_versions
      WHERE is_active = true
      ORDER BY id
    `);
    
    dbContent.rows.forEach(p => {
      console.log(`📄 Policy: ${p.title} (${p.user_type}/${p.language})`);
      console.log(`   ID: ${p.id}`);
      console.log(`   เนื้อหา:`);
      console.log(`   ${p.content}\n`);
    });
    
    // 2. ทดสอบ API endpoints
    console.log('='.repeat(80));
    console.log('\n2️⃣ ทดสอบ API Endpoints:\n');
    
    const tests = [
      { url: 'http://localhost:3000/api/simple-policy/active?userType=customer&language=th', desc: 'Customer Thai' },
      { url: 'http://localhost:3000/api/simple-policy/active?userType=customer&language=en', desc: 'Customer English' },
      { url: 'http://localhost:3000/api/simple-policy/active?userType=employee&language=th', desc: 'Employee Thai' }
    ];
    
    for (const test of tests) {
      try {
        const response = await axios.get(test.url);
        if (response.data.success && response.data.data) {
          console.log(`✅ ${test.desc}:`);
          console.log(`   Title: "${response.data.data.title}"`);
          console.log(`   Content: ${response.data.data.content?.substring(0, 100)}...`);
        } else {
          console.log(`❌ ${test.desc}: No data returned`);
        }
      } catch (err) {
        console.log(`❌ ${test.desc}: ${err.message}`);
      }
    }
    
    // 3. ตรวจสอบ Frontend API call
    console.log('\n='.repeat(80));
    console.log('\n3️⃣ Frontend API Configuration:\n');
    console.log('Frontend ควรเรียก API ดังนี้:');
    console.log('- Base URL: http://localhost:3000');
    console.log('- Endpoint: /api/simple-policy/active');
    console.log('- Parameters: userType=customer&language=th (หรือ en)');
    
    // 4. ตรวจสอบการแมพภาษา
    console.log('\n='.repeat(80));
    console.log('\n4️⃣ การแมพภาษา:\n');
    const mapping = await client.query(`
      SELECT user_type, language, title, 
             CASE 
               WHEN language = 'th' THEN 'ภาษาไทย'
               WHEN language = 'en' THEN 'English'
               ELSE language
             END as lang_display
      FROM policy_versions
      WHERE is_active = true
      ORDER BY user_type, language
    `);
    
    mapping.rows.forEach(m => {
      console.log(`${m.user_type}/${m.language} (${m.lang_display}) → "${m.title}"`);
    });
    
    // 5. สรุปปัญหาที่อาจเกิด
    console.log('\n='.repeat(80));
    console.log('\n⚠️ ปัญหาที่อาจเกิด:\n');
    console.log('1. เนื้อหาถูก override จากที่อื่น');
    console.log('2. Frontend cache เก่า - ลอง Hard Refresh (Ctrl+F5)');
    console.log('3. Backend ไม่ restart - ลอง restart server');
    console.log('4. Language mapping ผิด');
    
    console.log('\n='.repeat(80));
    console.log('\n✅ วิธีแก้ไข:\n');
    console.log('1. Restart backend: taskkill /F /IM node.exe แล้ว node server.js');
    console.log('2. Clear browser cache: Ctrl+F5');
    console.log('3. สร้าง policy ใหม่ผ่าน: http://localhost:5000/admin/create-policy');
    console.log('4. ตรวจสอบ console ใน browser ว่ามี error หรือไม่');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

deepCheckContent();
