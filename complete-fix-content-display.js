const { Pool } = require('pg');
const axios = require('axios');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '4321',
  database: 'consent'
});

async function completeFixContentDisplay() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 แก้ไขปัญหาการแสดงเนื้อหาทั้งหมด\n');
    console.log('='.repeat(80));
    
    // 1. ตรวจสอบข้อมูลในฐานข้อมูล
    console.log('📊 STEP 1: ตรวจสอบข้อมูลในฐานข้อมูล\n');
    const dbCheck = await client.query(`
      SELECT id, user_type, language, title, 
             LEFT(content, 200) as content_preview,
             is_active, created_at, updated_at
      FROM policy_versions
      WHERE is_active = true
      ORDER BY user_type, language
    `);
    
    console.log(`พบ ${dbCheck.rows.length} policies ที่ active:\n`);
    dbCheck.rows.forEach(p => {
      console.log(`ID ${p.id}: ${p.user_type}/${p.language} = "${p.title}"`);
      console.log(`Content: ${p.content_preview}...`);
      console.log(`Created: ${new Date(p.created_at).toLocaleString('th-TH')}`);
      console.log('');
    });
    
    // 2. ทดสอบ Backend API
    console.log('='.repeat(80));
    console.log('\n🔌 STEP 2: ทดสอบ Backend API\n');
    
    const apiTests = [
      { userType: 'customer', language: 'th', expected: 'ลูกค้าไทย' },
      { userType: 'customer', language: 'en', expected: 'ลูกค้าอังกฤษ' },
      { userType: 'employee', language: 'th', expected: 'พนักงานไทย' }
    ];
    
    for (const test of apiTests) {
      const url = `http://localhost:3000/api/simple-policy/active?userType=${test.userType}&language=${test.language}`;
      console.log(`Testing ${test.expected}: ${url}`);
      
      try {
        const response = await axios.get(url);
        if (response.data.success && response.data.data) {
          const data = response.data.data;
          console.log(`✅ API Response:`);
          console.log(`   Title: "${data.title}"`);
          console.log(`   User Type: ${data.user_type}`);
          console.log(`   Language: ${data.language}`);
          console.log(`   Content (first 100 chars): ${data.content?.substring(0, 100)}...`);
        } else {
          console.log(`❌ No data returned from API`);
        }
      } catch (error) {
        console.log(`❌ API Error: ${error.message}`);
      }
      console.log('');
    }
    
    // 3. ตรวจสอบการ mapping
    console.log('='.repeat(80));
    console.log('\n🔍 STEP 3: ตรวจสอบการ Mapping\n');
    
    const mappingCheck = await client.query(`
      SELECT user_type, language, title, id
      FROM policy_versions
      WHERE is_active = true
      ORDER BY user_type, language
    `);
    
    console.log('การ Mapping ปัจจุบัน:');
    mappingCheck.rows.forEach(m => {
      const langText = m.language === 'th' ? 'ภาษาไทย' : 'English';
      console.log(`${m.user_type}/${m.language} (${langText}) → Title: "${m.title}" (ID: ${m.id})`);
    });
    
    // 4. แก้ไขปัญหา
    console.log('\n='.repeat(80));
    console.log('\n🛠️ STEP 4: แก้ไขปัญหา\n');
    
    // ตรวจสอบว่ามี duplicate หรือไม่
    const duplicates = await client.query(`
      SELECT user_type, language, COUNT(*) as count
      FROM policy_versions
      WHERE is_active = true
      GROUP BY user_type, language
      HAVING COUNT(*) > 1
    `);
    
    if (duplicates.rows.length > 0) {
      console.log('⚠️ พบ duplicate policies - กำลังแก้ไข...');
      
      // Keep only the latest one for each user_type/language
      await client.query(`
        UPDATE policy_versions
        SET is_active = false
        WHERE id NOT IN (
          SELECT DISTINCT ON (user_type, language) id
          FROM policy_versions
          WHERE is_active = true
          ORDER BY user_type, language, updated_at DESC NULLS LAST, created_at DESC
        )
      `);
      
      console.log('✅ ลบ duplicates แล้ว');
    } else {
      console.log('✅ ไม่พบ duplicate policies');
    }
    
    // 5. สรุปผลและวิธีใช้
    console.log('\n='.repeat(80));
    console.log('\n✅ สรุปการแก้ไข:\n');
    
    const finalCheck = await client.query(`
      SELECT user_type, language, title
      FROM policy_versions
      WHERE is_active = true
      ORDER BY user_type, language
    `);
    
    console.log('Policies ที่พร้อมใช้งาน:');
    finalCheck.rows.forEach(p => {
      console.log(`• ${p.user_type}/${p.language}: "${p.title}"`);
    });
    
    console.log('\n📝 วิธีสร้าง/แก้ไข Policy:');
    console.log('1. ไปที่: http://localhost:5000/admin/create-policy');
    console.log('2. กรอกข้อมูล:');
    console.log('   - Title: ใส่ชื่อที่ต้องการ');
    console.log('   - User Type: เลือก customer/employee/partner');
    console.log('   - Language: เลือก th-TH หรือ en-US');
    console.log('   - Content: พิมพ์เนื้อหาที่ต้องการ');
    console.log('3. กด Save (ถ้า title ซ้ำจะอัพเดทของเดิม)');
    
    console.log('\n🔗 ลิงค์ทดสอบ:');
    console.log('• ลูกค้าไทย: http://localhost:5000/consent/customer?lang=th');
    console.log('• ลูกค้าอังกฤษ: http://localhost:5000/consent/customer?lang=en');
    console.log('• พนักงานไทย: http://localhost:5000/consent/employee?lang=th');
    
    console.log('\n⚠️ หากยังไม่เห็นเนื้อหาใหม่:');
    console.log('1. Restart Backend: ปิด terminal แล้วรัน node server.js ใหม่');
    console.log('2. Clear Browser Cache: กด Ctrl+F5');
    console.log('3. ตรวจสอบ Console (F12) ดู error');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

completeFixContentDisplay();
