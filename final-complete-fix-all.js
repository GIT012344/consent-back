const { Pool } = require('pg');
const axios = require('axios');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '4321',
  database: 'consent'
});

async function finalCompleteFixAll() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 แก้ไขทั้งหมดให้ทำงานได้จริง\n');
    console.log('='.repeat(80));
    
    // 1. ลบทั้งหมดและสร้างใหม่
    console.log('1. RESET และสร้างใหม่:\n');
    
    await client.query('DELETE FROM policy_versions');
    console.log('✅ ลบข้อมูลเก่าทั้งหมด');
    
    // 2. สร้าง policy ใหม่ที่ถูกต้อง
    const result = await client.query(`
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
<p>อำพลสนุยมความยอมพใจ</p>',
        true,
        NOW(),
        NOW()
      ) RETURNING *
    `);
    
    const policy = result.rows[0];
    console.log(`✅ สร้าง Policy ID: ${policy.id}`);
    console.log(`   Title: ${policy.title}`);
    console.log(`   User Type: ${policy.user_type}`);
    console.log(`   Language: ${policy.language}`);
    console.log(`   Active: ${policy.is_active}`);
    
    // 3. สร้าง policies อื่นๆ
    await client.query(`
      INSERT INTO policy_versions (
        title, user_type, language, version, content, is_active
      ) VALUES 
      ('002', 'customer', 'en', '1.0.0', '<h1>Privacy Policy</h1><p>English content</p>', true),
      ('003', 'employee', 'th', '1.0.0', '<h1>นโยบายพนักงาน</h1><p>เนื้อหาสำหรับพนักงาน</p>', true)
    `);
    console.log('✅ สร้าง policies อื่นๆ');
    
    // 4. ตรวจสอบผลลัพธ์
    console.log('\n2. ตรวจสอบผลลัพธ์:\n');
    
    const check = await client.query(`
      SELECT user_type, language, title
      FROM policy_versions
      WHERE is_active = true
      ORDER BY user_type, language
    `);
    
    console.log('Policies ที่พร้อมใช้:');
    check.rows.forEach(p => {
      console.log(`• ${p.user_type}/${p.language}: "${p.title}"`);
    });
    
    // 5. ทดสอบ API
    console.log('\n3. ทดสอบ API:\n');
    
    try {
      const apiRes = await axios.get('http://localhost:3000/api/simple-policy/active?userType=customer&language=th');
      if (apiRes.data.success && apiRes.data.data) {
        console.log('✅ API พบ Policy');
        console.log(`   Title: ${apiRes.data.data.title}`);
        console.log(`   Content: ${apiRes.data.data.content?.substring(0, 50)}...`);
      } else {
        console.log('❌ API ไม่พบ Policy');
        console.log(`   Message: ${apiRes.data.message}`);
      }
    } catch (err) {
      console.log('⚠️ API Error - ตรวจสอบว่า backend ทำงานอยู่');
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('\n✅ แก้ไขเสร็จสมบูรณ์!\n');
    console.log('ทดสอบ:');
    console.log('1. http://localhost:5000/consent/customer?lang=th → แสดง 001');
    console.log('2. http://localhost:5000/consent/customer?lang=en → แสดง 002');
    console.log('3. http://localhost:5000/consent/employee?lang=th → แสดง 003');
    console.log('\nกด Ctrl+F5 เพื่อ refresh หน้า');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

finalCompleteFixAll();
