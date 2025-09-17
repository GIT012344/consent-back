const { Pool } = require('pg');
const axios = require('axios');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'consent',
  user: 'postgres',
  password: '4321'
});

async function traceContentFlow() {
  try {
    console.log('🔍 ติดตามการไหลของเนื้อหาทั้งระบบ...\n');
    
    // STEP 1: ดูว่ามีอะไรในฐานข้อมูล
    console.log('STEP 1: เนื้อหาในฐานข้อมูล');
    console.log('================================\n');
    
    const dbResult = await pool.query(`
      SELECT * FROM policy_versions 
      ORDER BY created_at DESC
    `);
    
    if (dbResult.rows.length === 0) {
      console.log('❌ ฐานข้อมูลว่าง! ไม่มี policy เลย');
      console.log('\n💡 วิธีแก้:');
      console.log('1. เข้า http://localhost:3003/admin/create-policy');
      console.log('2. สร้าง policy ใหม่');
      console.log('3. กรอกข้อมูล:');
      console.log('   - User Type: customer');
      console.log('   - Language: th-TH');
      console.log('   - Title: [หัวข้อที่คุณต้องการ]');
      console.log('   - Content: [เนื้อหาที่คุณต้องการ]');
      console.log('4. กด Save');
      return;
    }
    
    console.log(`✅ พบ ${dbResult.rows.length} policies\n`);
    dbResult.rows.forEach(p => {
      console.log(`ID: ${p.id}`);
      console.log(`Version: ${p.version}`);
      console.log(`UserType: ${p.user_type}`);
      console.log(`Language: ${p.language}`);
      console.log(`Title: ${p.title}`);
      console.log(`Active: ${p.is_active}`);
      console.log(`Created: ${p.created_at}`);
      console.log(`Content:`);
      console.log('---START---');
      console.log(p.content);
      console.log('---END---\n');
    });
    
    // STEP 2: ทดสอบ API endpoint /api/simple-policy/active
    console.log('\nSTEP 2: ทดสอบ API /api/simple-policy/active');
    console.log('================================\n');
    
    for (const policy of dbResult.rows) {
      const url = `http://localhost:3000/api/simple-policy/active?userType=${policy.user_type}&language=${policy.language}`;
      console.log(`Testing: ${url}`);
      
      try {
        const apiRes = await axios.get(url);
        
        if (apiRes.data.success && apiRes.data.data) {
          console.log(`✅ API Response OK`);
          console.log(`   Title: ${apiRes.data.data.title}`);
          
          // เปรียบเทียบเนื้อหา
          if (apiRes.data.data.content === policy.content) {
            console.log(`   ✅ เนื้อหาตรงกับฐานข้อมูล`);
          } else {
            console.log(`   ❌ เนื้อหาไม่ตรง!`);
            console.log(`   DB Content: "${policy.content.substring(0, 50)}..."`);
            console.log(`   API Content: "${apiRes.data.data.content.substring(0, 50)}..."`);
          }
        } else {
          console.log(`❌ API ไม่พบข้อมูล`);
        }
      } catch (e) {
        console.log(`❌ API Error: ${e.message}`);
      }
      console.log('');
    }
    
    // STEP 3: แสดง URL ที่ควรใช้
    console.log('\nSTEP 3: URLs สำหรับทดสอบ');
    console.log('================================\n');
    
    const customerPolicies = dbResult.rows.filter(p => p.user_type === 'customer');
    const otherPolicies = dbResult.rows.filter(p => p.user_type !== 'customer');
    
    if (customerPolicies.length > 0) {
      console.log('Customer Policies:');
      customerPolicies.forEach(p => {
        if (p.language === 'th-TH') {
          console.log(`  - ภาษาไทย: http://localhost:3003/consent/select-language → เลือก "ภาษาไทย"`);
          console.log(`    ควรแสดง: "${p.title}"`);
        } else if (p.language === 'en-US') {
          console.log(`  - English: http://localhost:3003/consent/select-language → เลือก "English"`);
          console.log(`    ควรแสดง: "${p.title}"`);
        }
      });
    }
    
    if (otherPolicies.length > 0) {
      console.log('\nOther UserType Policies:');
      otherPolicies.forEach(p => {
        const lang = p.language === 'th-TH' ? 'th' : 'en';
        console.log(`  - ${p.user_type}: http://localhost:3003/consent/${p.user_type}?lang=${lang}`);
        console.log(`    ควรแสดง: "${p.title}"`);
      });
    }
    
    // STEP 4: วินิจฉัยปัญหา
    console.log('\n\nSTEP 4: วินิจฉัยปัญหา');
    console.log('================================\n');
    
    console.log('⚠️ ถ้าเนื้อหายังไม่ตรง:');
    console.log('\n1. ตรวจสอบ Backend:');
    console.log('   - Backend ต้องทำงานที่ port 3000');
    console.log('   - รีสตาร์ท: Ctrl+C แล้ว node server.js');
    
    console.log('\n2. ตรวจสอบ Frontend:');
    console.log('   - Clear Cache: Ctrl+Shift+Delete');
    console.log('   - Hard Refresh: Ctrl+Shift+R');
    
    console.log('\n3. ตรวจสอบการสร้าง Policy:');
    console.log('   - เมื่อสร้างใหม่ต้องรีสตาร์ท Backend');
    console.log('   - ตรวจสอบว่า is_active = true');
    
    console.log('\n4. ถ้ายังไม่ได้ - ลบและสร้างใหม่:');
    console.log('   - รัน: node clear-and-guide-creation.js');
    console.log('   - สร้างใหม่ที่: http://localhost:3003/admin/create-policy');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

traceContentFlow();
