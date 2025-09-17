const { Pool } = require('pg');
const axios = require('axios');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'consent',
  user: 'postgres',
  password: '4321'
});

async function checkRealContent() {
  try {
    console.log('🔍 ตรวจสอบเนื้อหาจริงในระบบ...\n');
    
    // 1. ดูเนื้อหาล่าสุดในฐานข้อมูล
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('1. เนื้อหาล่าสุดในฐานข้อมูล');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const dbData = await pool.query(`
      SELECT id, version, user_type, language, title, content, created_at
      FROM policy_versions
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    if (dbData.rows.length === 0) {
      console.log('❌ ไม่มี policies ในฐานข้อมูล!');
      console.log('กรุณาสร้างใหม่ที่: http://localhost:3003/admin/create-policy');
      return;
    }
    
    console.log(`พบ ${dbData.rows.length} policies ล่าสุด:\n`);
    
    dbData.rows.forEach((p, idx) => {
      console.log(`\n[${idx + 1}] ID: ${p.id} | Created: ${p.created_at}`);
      console.log(`    Version: ${p.version}`);
      console.log(`    UserType: "${p.user_type}"`);
      console.log(`    Language: ${p.language}`);
      console.log(`    Title: ${p.title}`);
      console.log(`    Content (ทั้งหมด):`);
      console.log('    ----------------------------------------');
      console.log(p.content);
      console.log('    ----------------------------------------');
    });
    
    // 2. ทดสอบ API endpoint
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('2. ทดสอบ API Endpoint');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // รวบรวม userType และ language ที่มี
    const uniqueCombos = {};
    dbData.rows.forEach(p => {
      const key = `${p.user_type}|${p.language}`;
      if (!uniqueCombos[key]) {
        uniqueCombos[key] = { userType: p.user_type, language: p.language, title: p.title };
      }
    });
    
    for (const combo of Object.values(uniqueCombos)) {
      console.log(`\nTest: ${combo.userType} - ${combo.language}`);
      console.log(`Expected: "${combo.title}"`);
      
      try {
        const res = await axios.get(
          `http://localhost:3000/api/simple-policy/active?userType=${combo.userType}&language=${combo.language}`
        );
        
        if (res.data.success && res.data.data) {
          console.log(`✅ API Response:`);
          console.log(`   Title: ${res.data.data.title}`);
          console.log(`   Content (first 200 chars): ${res.data.data.content.substring(0, 200)}...`);
          
          // เช็คว่าตรงกันไหม
          const dbPolicy = dbData.rows.find(p => 
            p.user_type === combo.userType && p.language === combo.language
          );
          
          if (dbPolicy && dbPolicy.content === res.data.data.content) {
            console.log(`   ✅ เนื้อหาตรงกับในฐานข้อมูล`);
          } else {
            console.log(`   ❌ เนื้อหาไม่ตรงกับในฐานข้อมูล!`);
          }
        } else {
          console.log(`❌ ไม่พบข้อมูลจาก API`);
        }
      } catch (e) {
        console.log(`❌ API Error: ${e.message}`);
      }
    }
    
    // 3. สรุป
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('3. สรุปและวิธีแก้ไข');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('📌 ถ้าเนื้อหาไม่ตรง:');
    console.log('1. รีสตาร์ท Backend (Ctrl+C แล้ว node server.js)');
    console.log('2. Clear Browser Cache (Ctrl+Shift+Delete)');
    console.log('3. Hard Refresh (Ctrl+Shift+R)');
    console.log('\n📌 ถ้ายังไม่ได้:');
    console.log('1. ลบ policies เก่าทั้งหมด');
    console.log('2. สร้างใหม่ที่ http://localhost:3003/admin/create-policy');
    console.log('3. ใส่เนื้อหาที่ต้องการ');
    console.log('4. รีสตาร์ท Backend อีกครั้ง');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkRealContent();
