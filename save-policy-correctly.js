const { Pool } = require('pg');
const axios = require('axios');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '4321',
  database: 'consent'
});

async function savePolicyCorrectly() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 บันทึก Policy ให้ถูกต้องตามที่ Admin สร้าง\n');
    console.log('='.repeat(80));
    
    // เนื้อหาจากภาพที่คุณส่งมา
    const adminContent = `<p>นโยบายเลือกข้อหาม</p>
<p>ผลิตภัณฑ์นี้ความเอาผา</p>
<p>อำพลสนุยมความยอมพใจ</p>`;
    
    // 1. ตรวจสอบว่ามี policy อยู่แล้วหรือไม่
    console.log('1. ตรวจสอบ Policy ที่มีอยู่:\n');
    const existing = await client.query(`
      SELECT id, title, user_type, language 
      FROM policy_versions
      WHERE user_type = 'customer' AND language = 'th'
    `);
    
    if (existing.rows.length > 0) {
      // อัพเดท
      await client.query(`
        UPDATE policy_versions 
        SET title = '001', 
            content = $1, 
            version = '1.0.0',
            is_active = true,
            updated_at = NOW()
        WHERE user_type = 'customer' AND language = 'th'
      `, [adminContent]);
      console.log(`✅ อัพเดท Policy ID ${existing.rows[0].id}`);
    } else {
      // สร้างใหม่
      const result = await client.query(`
        INSERT INTO policy_versions (
          title, user_type, language, version, content, is_active
        ) VALUES (
          '001', 'customer', 'th', '1.0.0', $1, true
        ) RETURNING id
      `, [adminContent]);
      console.log(`✅ สร้าง Policy ใหม่ ID ${result.rows[0].id}`);
    }
    
    // 2. ตรวจสอบผลลัพธ์
    console.log('\n2. ตรวจสอบผลลัพธ์:\n');
    const verify = await client.query(`
      SELECT title, content 
      FROM policy_versions
      WHERE user_type = 'customer' AND language = 'th' AND is_active = true
    `);
    
    if (verify.rows.length > 0) {
      console.log(`Title: "${verify.rows[0].title}"`);
      console.log('Content:');
      console.log('-'.repeat(60));
      console.log(verify.rows[0].content);
      console.log('-'.repeat(60));
    }
    
    // 3. ทดสอบ API
    console.log('\n3. ทดสอบ API:\n');
    try {
      const res = await axios.get('http://localhost:3000/api/simple-policy/active?userType=customer&language=th');
      if (res.data.success) {
        console.log('✅ API พบ Policy');
        console.log(`Title: ${res.data.data.title}`);
      } else {
        console.log('❌ API ไม่พบ Policy');
      }
    } catch (err) {
      console.log('⚠️ API Error - ตรวจสอบว่า backend ทำงานอยู่');
    }
    
    console.log('\n✅ บันทึกเสร็จแล้ว!');
    console.log('\nทดสอบที่: http://localhost:5000/consent/customer?lang=th');
    console.log('กด Ctrl+F5 เพื่อ refresh');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

savePolicyCorrectly();
