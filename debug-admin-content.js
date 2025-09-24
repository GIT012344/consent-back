const { Pool } = require('pg');
const axios = require('axios');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '4321',
  database: 'consent'
});

async function debugAdminContent() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 DEBUG: ตรวจสอบปัญหาเนื้อหาที่ Admin สร้าง\n');
    console.log('='.repeat(80));
    
    // 1. ดูเนื้อหาจริงในฐานข้อมูล
    console.log('📊 เนื้อหาปัจจุบันในฐานข้อมูล:\n');
    const policies = await client.query(`
      SELECT id, user_type, language, title, 
             content,
             created_at, updated_at
      FROM policy_versions
      WHERE is_active = true
      ORDER BY created_at DESC
    `);
    
    policies.rows.forEach(p => {
      console.log(`ID ${p.id}: ${p.title} (${p.user_type}/${p.language})`);
      console.log(`Created: ${new Date(p.created_at).toLocaleString('th-TH')}`);
      console.log(`Content จริงในฐานข้อมูล:`);
      console.log('-'.repeat(60));
      console.log(p.content);
      console.log('-'.repeat(60));
      console.log('');
    });
    
    // 2. ทดสอบ API ว่าส่งอะไรกลับมา
    console.log('\n📡 ทดสอบ API Response:\n');
    
    try {
      const response = await axios.get('http://localhost:3000/api/simple-policy/active?userType=customer&language=th');
      if (response.data.success && response.data.data) {
        console.log('API ส่งกลับมา:');
        console.log(`Title: ${response.data.data.title}`);
        console.log(`Content ที่ API ส่ง:`);
        console.log('-'.repeat(60));
        console.log(response.data.data.content);
        console.log('-'.repeat(60));
      }
    } catch (err) {
      console.log('API Error:', err.message);
    }
    
    // 3. ตรวจสอบการบันทึกใหม่
    console.log('\n🧪 ทดสอบการบันทึก Policy ใหม่:\n');
    
    // ลองอัพเดทเนื้อหาตรงๆ
    const testContent = '<h1>TEST CONTENT FROM ADMIN</h1><p>นี่คือเนื้อหาทดสอบจาก Admin</p>';
    await client.query(`
      UPDATE policy_versions 
      SET content = $1, updated_at = NOW()
      WHERE title = '001' AND user_type = 'customer' AND language = 'th'
    `, [testContent]);
    
    console.log('✅ อัพเดทเนื้อหา 001 เป็น TEST CONTENT');
    
    // ตรวจสอบว่าบันทึกสำเร็จ
    const check = await client.query(`
      SELECT content FROM policy_versions 
      WHERE title = '001' AND user_type = 'customer' AND language = 'th'
    `);
    
    if (check.rows.length > 0) {
      console.log('\nเนื้อหาหลังอัพเดท:');
      console.log(check.rows[0].content);
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('\n💡 วิธีแก้ไข:\n');
    console.log('1. ไปที่ http://localhost:5000/admin/create-policy');
    console.log('2. สร้าง Policy ใหม่ด้วย title 001, 002, 003');
    console.log('3. ใส่เนื้อหาที่ต้องการ');
    console.log('4. กด Save');
    console.log('5. ไปทดสอบที่ http://localhost:5000/consent/customer?lang=th');
    console.log('\nถ้ายังไม่เห็นเนื้อหาใหม่:');
    console.log('- กด Ctrl+F5 เพื่อ clear cache');
    console.log('- ดู Console ใน browser (F12) ว่ามี error ไหม');
    console.log('- ตรวจสอบ Network tab ว่า API ส่งอะไรกลับมา');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

debugAdminContent();
