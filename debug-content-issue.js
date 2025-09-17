const { Pool } = require('pg');
const axios = require('axios');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'consent',
  user: 'postgres',
  password: '4321'
});

async function debugContentIssue() {
  try {
    console.log('🔍 ตรวจสอบปัญหาเนื้อหาอย่างละเอียด...\n');
    
    // STEP 1: ดูข้อมูลในฐานข้อมูล
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 1: เนื้อหาในฐานข้อมูล');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const dbResult = await pool.query(`
      SELECT * FROM policy_versions 
      WHERE is_active = true
      ORDER BY created_at DESC
    `);
    
    console.log(`พบ ${dbResult.rows.length} active policies\n`);
    
    dbResult.rows.forEach((p, idx) => {
      console.log(`[${idx + 1}] ID: ${p.id}`);
      console.log(`    Version: ${p.version}`);
      console.log(`    UserType: ${p.user_type}`);
      console.log(`    Language: ${p.language}`);
      console.log(`    Title: ${p.title}`);
      console.log(`    Active: ${p.is_active}`);
      console.log(`    Created: ${p.created_at}`);
      console.log(`    Content:`);
      console.log('    ===START===');
      console.log(p.content);
      console.log('    ===END===\n');
    });
    
    // STEP 2: ทดสอบ API endpoint
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 2: ทดสอบ API /api/simple-policy/active');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const testCases = [
      { userType: 'customer', language: 'th-TH' },
      { userType: 'customer', language: 'en-US' },
      { userType: 'employee', language: 'th-TH' },
      { userType: 'partner', language: 'th-TH' }
    ];
    
    for (const test of testCases) {
      const url = `http://localhost:3000/api/simple-policy/active?userType=${test.userType}&language=${test.language}`;
      console.log(`\nTesting: ${test.userType} - ${test.language}`);
      console.log(`URL: ${url}`);
      
      try {
        const response = await axios.get(url);
        
        if (response.data.success && response.data.data) {
          console.log(`✅ API Response:`);
          console.log(`   Version: ${response.data.data.version}`);
          console.log(`   Title: ${response.data.data.title}`);
          console.log(`   Content:`);
          console.log('   ---');
          console.log(response.data.data.content);
          console.log('   ---');
          
          // เปรียบเทียบกับฐานข้อมูล
          const dbPolicy = dbResult.rows.find(p => 
            p.user_type === test.userType && p.language === test.language
          );
          
          if (dbPolicy) {
            if (dbPolicy.content === response.data.data.content) {
              console.log(`   ✅ เนื้อหาตรงกับฐานข้อมูล`);
            } else {
              console.log(`   ❌ เนื้อหาไม่ตรงกับฐานข้อมูล!`);
              console.log(`   DB: "${dbPolicy.content.substring(0, 50)}..."`);
              console.log(`   API: "${response.data.data.content.substring(0, 50)}..."`);
            }
          } else {
            console.log(`   ⚠️ ไม่พบข้อมูลในฐานข้อมูลสำหรับ ${test.userType} - ${test.language}`);
          }
        } else {
          console.log(`❌ API ไม่พบข้อมูล`);
          console.log(`Response:`, response.data);
        }
      } catch (error) {
        console.log(`❌ API Error: ${error.message}`);
        if (error.response) {
          console.log(`Status: ${error.response.status}`);
          console.log(`Data:`, error.response.data);
        }
      }
    }
    
    // STEP 3: ตรวจสอบไฟล์ที่อาจมีปัญหา
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 3: ไฟล์ที่ต้องตรวจสอบ');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('Backend:');
    console.log('  ✓ routes/simple-policy-active.js - ต้องดึงจาก policy_versions');
    console.log('  ✓ routes/simple-policy.js - สำหรับสร้าง/แก้ไข policy');
    console.log('  ✓ server.js - ต้อง register route');
    
    console.log('\nFrontend:');
    console.log('  ✓ src/pages/ConsentFlowPage.js - เรียก API');
    console.log('  ✓ src/pages/CreateSinglePolicy.js - สร้าง policy');
    
    // STEP 4: วิธีแก้ไข
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 4: วิธีแก้ไข');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    if (dbResult.rows.length === 0) {
      console.log('❌ ไม่มี active policies!');
      console.log('\nแก้ไข:');
      console.log('1. สร้าง policy ใหม่ที่ http://localhost:3003/admin/create-policy');
      console.log('2. ตรวจสอบว่า is_active = true');
    } else {
      console.log('✅ มี active policies ในฐานข้อมูล');
      console.log('\nตรวจสอบ:');
      console.log('1. Backend ทำงานที่ port 3000');
      console.log('2. รีสตาร์ท Backend: Ctrl+C แล้ว node server.js');
      console.log('3. Clear Browser Cache: Ctrl+Shift+Delete');
      console.log('4. Hard Refresh: Ctrl+Shift+R');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

debugContentIssue();
