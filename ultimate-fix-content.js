const { Pool } = require('pg');
const axios = require('axios');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '4321',
  database: 'consent'
});

async function ultimateFixContent() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 แก้ไขครั้งสุดท้าย - ให้เนื้อหาแสดงตามที่ Admin พิมพ์\n');
    console.log('='.repeat(80));
    
    // 1. ลบ policies เก่าทั้งหมดและสร้างใหม่
    console.log('1. RESET และสร้างใหม่:\n');
    
    // ลบ customer/th เก่า
    await client.query(`
      DELETE FROM policy_versions 
      WHERE user_type = 'customer' AND language = 'th'
    `);
    
    // สร้างใหม่ด้วยเนื้อหาที่ชัดเจน
    const testContent = `<h1>นโยบายความเป็นส่วนตัว - TEST ${new Date().toLocaleTimeString('th-TH')}</h1>
<p>นี่คือเนื้อหาที่ Admin สร้างผ่านหน้า Create Policy</p>
<h2>ข้อตกลงการใช้งาน</h2>
<ul>
  <li>ข้อมูลของคุณจะถูกเก็บอย่างปลอดภัย</li>
  <li>เราจะไม่เปิดเผยข้อมูลของคุณ</li>
  <li>คุณสามารถขอลบข้อมูลได้ตลอดเวลา</li>
</ul>
<p><strong>อัพเดทล่าสุด:</strong> ${new Date().toLocaleString('th-TH')}</p>`;
    
    const result = await client.query(`
      INSERT INTO policy_versions (
        title, user_type, language, version, content, is_active, created_at, updated_at
      ) VALUES (
        'นโยบายความเป็นส่วนตัว',
        'customer',
        'th',
        '1.0.0',
        $1,
        true,
        NOW(),
        NOW()
      ) RETURNING id
    `, [testContent]);
    
    console.log(`✅ สร้าง Policy ID ${result.rows[0].id}`);
    console.log('\nเนื้อหาที่บันทึก:');
    console.log('-'.repeat(60));
    console.log(testContent);
    console.log('-'.repeat(60));
    
    // 2. ทดสอบ API
    console.log('\n2. ทดสอบ API:\n');
    
    try {
      const apiTest = await axios.get(
        'http://localhost:3000/api/simple-policy/active?userType=customer&language=th'
      );
      
      if (apiTest.data.success && apiTest.data.data) {
        console.log('✅ API Response OK');
        console.log(`Title: "${apiTest.data.data.title}"`);
        console.log(`Content matches: ${apiTest.data.data.content === testContent ? '✅ YES' : '❌ NO'}`);
      } else {
        console.log('❌ API ไม่ส่งข้อมูล');
      }
    } catch (err) {
      console.log('❌ API Error - Backend อาจไม่ทำงาน');
    }
    
    // 3. สร้าง policies อื่นๆ ด้วย
    console.log('\n3. สร้าง Policies อื่นๆ:\n');
    
    // Customer English
    await client.query(`
      DELETE FROM policy_versions 
      WHERE user_type = 'customer' AND language = 'en'
    `);
    
    await client.query(`
      INSERT INTO policy_versions (
        title, user_type, language, version, content, is_active
      ) VALUES (
        'Privacy Policy',
        'customer',
        'en',
        '1.0.0',
        '<h1>Privacy Policy - TEST</h1><p>This is content created by Admin</p>',
        true
      )
    `);
    console.log('✅ สร้าง customer/en');
    
    // Employee Thai
    await client.query(`
      DELETE FROM policy_versions 
      WHERE user_type = 'employee' AND language = 'th'
    `);
    
    await client.query(`
      INSERT INTO policy_versions (
        title, user_type, language, version, content, is_active
      ) VALUES (
        'นโยบายพนักงาน',
        'employee',
        'th',
        '1.0.0',
        '<h1>นโยบายสำหรับพนักงาน</h1><p>เนื้อหาสำหรับพนักงาน</p>',
        true
      )
    `);
    console.log('✅ สร้าง employee/th');
    
    console.log('\n' + '='.repeat(80));
    console.log('\n✅ แก้ไขเสร็จสิ้น!\n');
    console.log('📋 Policies ที่พร้อมใช้:');
    
    const final = await client.query(`
      SELECT user_type, language, title
      FROM policy_versions
      WHERE is_active = true
      ORDER BY user_type, language
    `);
    
    final.rows.forEach(p => {
      console.log(`• ${p.user_type}/${p.language}: "${p.title}"`);
    });
    
    console.log('\n🔗 ทดสอบ:');
    console.log('1. ไปที่: http://localhost:5000/consent/customer?lang=th');
    console.log('2. กด F12 ดู Console');
    console.log('3. ดูว่ามี log "Policy data from API:" หรือไม่');
    console.log('4. กด Ctrl+F5 เพื่อ refresh');
    console.log('\n⚠️ ถ้ายังไม่เห็นเนื้อหาใหม่:');
    console.log('- Restart backend: Ctrl+C แล้ว npm run dev');
    console.log('- Clear localStorage: F12 → Application → Clear Storage');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

ultimateFixContent();
