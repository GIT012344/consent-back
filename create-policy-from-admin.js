const { Pool } = require('pg');
const axios = require('axios');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '4321',
  database: 'consent'
});

async function createPolicyFromAdmin() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 สร้าง Policy จากข้อมูลที่ Admin กรอก\n');
    console.log('='.repeat(80));
    
    // จากภาพที่คุณส่งมา:
    // - ภาษา: ภาษาไทย
    // - User Type: ลูกค้า
    // - Title: 001
    // - Content: นโยบายเลือกข้อหาม...
    
    const adminContent = `นโยบายเลือกข้อหาม
ผลิตภัณฑ์นี้ความเอาผา
อำพลสนุยมความยอมพใจ`;
    
    // 1. ลบ policy เก่า
    console.log('1. ลบ Policy เก่า:\n');
    await client.query(`
      DELETE FROM policy_versions 
      WHERE user_type = 'customer' AND language = 'th'
    `);
    console.log('✅ ลบ policy เก่าแล้ว');
    
    // 2. สร้าง policy ใหม่ตามที่ Admin กรอก
    console.log('\n2. สร้าง Policy ใหม่:\n');
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
        $1,
        true,
        NOW(),
        NOW()
      ) RETURNING id
    `, [adminContent]);
    
    console.log(`✅ สร้าง Policy ID ${result.rows[0].id}`);
    console.log('\nข้อมูล Policy:');
    console.log('- Title: 001');
    console.log('- User Type: customer');
    console.log('- Language: th');
    console.log('- Content:');
    console.log('-'.repeat(60));
    console.log(adminContent);
    console.log('-'.repeat(60));
    
    // 3. ตรวจสอบว่าบันทึกสำเร็จ
    console.log('\n3. ตรวจสอบในฐานข้อมูล:\n');
    const check = await client.query(`
      SELECT id, title, user_type, language, content
      FROM policy_versions
      WHERE user_type = 'customer' AND language = 'th' AND is_active = true
    `);
    
    if (check.rows.length > 0) {
      console.log('✅ พบ Policy ในฐานข้อมูล');
      console.log(`ID: ${check.rows[0].id}`);
      console.log(`Title: ${check.rows[0].title}`);
    } else {
      console.log('❌ ไม่พบ Policy');
    }
    
    // 4. ทดสอบ API
    console.log('\n4. ทดสอบ API:\n');
    try {
      const apiTest = await axios.get(
        'http://localhost:3000/api/simple-policy/active?userType=customer&language=th'
      );
      
      if (apiTest.data.success && apiTest.data.data) {
        console.log('✅ API Response:');
        console.log(`Title: "${apiTest.data.data.title}"`);
        console.log(`Content: ${apiTest.data.data.content}`);
      } else {
        console.log('❌ API ไม่พบข้อมูล');
      }
    } catch (err) {
      console.log('❌ API Error - Backend อาจไม่ทำงาน');
      console.log('กรุณารัน: npm run dev ใน consent-back folder');
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('\n✅ สร้าง Policy เสร็จแล้ว!\n');
    console.log('ทดสอบที่: http://localhost:5000/consent/customer?lang=th');
    console.log('\nถ้ายังไม่เห็น:');
    console.log('1. กด Ctrl+F5 เพื่อ refresh');
    console.log('2. Restart backend: Ctrl+C แล้ว npm run dev');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

createPolicyFromAdmin();
