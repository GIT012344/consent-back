const { Pool } = require('pg');
const axios = require('axios');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '4321',
  database: 'consent'
});

async function fixPolicyNotFound() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 แก้ไขปัญหา "ไม่พบ Policy"\n');
    console.log('='.repeat(80));
    
    // 1. ตรวจสอบว่ามี policy ในฐานข้อมูลหรือไม่
    console.log('1. ตรวจสอบฐานข้อมูล:\n');
    const checkDb = await client.query(`
      SELECT * FROM policy_versions
      WHERE is_active = true
      ORDER BY created_at DESC
    `);
    
    console.log(`พบ ${checkDb.rows.length} policies ในฐานข้อมูล:`);
    checkDb.rows.forEach(p => {
      console.log(`- ${p.user_type}/${p.language}: "${p.title}"`);
    });
    
    // 2. สร้าง policy สำหรับ customer/th
    console.log('\n2. สร้าง Policy สำหรับ customer/th:\n');
    
    // ลบเก่า
    await client.query(`
      DELETE FROM policy_versions 
      WHERE user_type = 'customer' AND language = 'th'
    `);
    
    // สร้างใหม่
    const newPolicy = await client.query(`
      INSERT INTO policy_versions (
        title,
        user_type,
        language,
        version,
        content,
        is_active,
        created_at,
        updated_at
      ) VALUES (
        '001',
        'customer',
        'th',
        '1.0.0',
        '<h1>นโยบายความเป็นส่วนตัว</h1>
<p>นโยบายเลือกข้อหาม</p>
<p>ผลิตภัณฑ์นี้ความเอาผา</p>
<p>อำพลสนุยมความยอมพใจ</p>
<p>Created: ${new Date().toLocaleString('th-TH')}</p>',
        true,
        NOW(),
        NOW()
      ) RETURNING *
    `);
    
    console.log(`✅ สร้าง Policy ID: ${newPolicy.rows[0].id}`);
    console.log(`   Title: ${newPolicy.rows[0].title}`);
    console.log(`   User Type: ${newPolicy.rows[0].user_type}`);
    console.log(`   Language: ${newPolicy.rows[0].language}`);
    
    // 3. ทดสอบ API endpoint
    console.log('\n3. ทดสอบ API:\n');
    
    // Test exact endpoint that frontend uses
    const testUrls = [
      'http://localhost:3000/api/simple-policy/active?userType=customer&language=th',
      'http://localhost:3000/api/simple-policy?userType=customer&language=th'
    ];
    
    for (const url of testUrls) {
      console.log(`Testing: ${url}`);
      try {
        const response = await axios.get(url);
        if (response.data.success && response.data.data) {
          console.log(`✅ Found: "${response.data.data.title}"`);
        } else if (response.data.policies) {
          console.log(`✅ Found ${response.data.policies.length} policies`);
        } else {
          console.log(`❌ No data`);
        }
      } catch (err) {
        console.log(`❌ Error: ${err.message}`);
      }
    }
    
    // 4. ตรวจสอบ final state
    console.log('\n4. Final Check:\n');
    const finalCheck = await client.query(`
      SELECT user_type, language, title, is_active
      FROM policy_versions
      WHERE user_type = 'customer' AND language = 'th'
    `);
    
    if (finalCheck.rows.length > 0) {
      console.log('✅ Policy exists in database:');
      finalCheck.rows.forEach(p => {
        console.log(`   ${p.user_type}/${p.language}: "${p.title}" (Active: ${p.is_active})`);
      });
    } else {
      console.log('❌ No policy found for customer/th');
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('\n✅ แก้ไขเสร็จแล้ว!\n');
    console.log('ขั้นตอนต่อไป:');
    console.log('1. Restart backend: Ctrl+C แล้ว npm run dev');
    console.log('2. ไปที่: http://localhost:5000/consent/customer?lang=th');
    console.log('3. กด Ctrl+F5 เพื่อ clear cache');
    console.log('\nถ้ายังไม่เห็น:');
    console.log('- ดู Console (F12) ว่ามี error อะไร');
    console.log('- ดู Network tab ว่า API call ได้ response อะไร');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

fixPolicyNotFound();
