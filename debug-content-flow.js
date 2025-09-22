const { Pool } = require('pg');
const axios = require('axios');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '4321',
  database: 'consent'
});

async function debugContentFlow() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 DEBUG: ติดตามการไหลของเนื้อหาจาก Admin → Database → API → Frontend\n');
    console.log('='.repeat(80));
    
    // 1. ดูเนื้อหาจริงๆ ในฐานข้อมูล
    console.log('1️⃣ DATABASE - เนื้อหาจริงในฐานข้อมูล:\n');
    const dbContent = await client.query(`
      SELECT id, user_type, language, title, content, created_at, updated_at
      FROM policy_versions
      WHERE is_active = true 
        AND user_type = 'customer' 
        AND language = 'th'
      ORDER BY updated_at DESC NULLS LAST, created_at DESC
      LIMIT 1
    `);
    
    if (dbContent.rows.length === 0) {
      console.log('❌ ไม่พบ policy สำหรับ customer/th');
      console.log('\n💡 กำลังสร้างตัวอย่าง...');
      
      await client.query(`
        INSERT INTO policy_versions (
          title, user_type, language, version, content, is_active
        ) VALUES (
          'Test Policy',
          'customer',
          'th',
          '1.0',
          '<h1>TEST CONTENT FROM ADMIN</h1><p>นี่คือเนื้อหาที่ Admin พิมพ์</p>',
          true
        )
      `);
      console.log('✅ สร้าง test policy แล้ว');
    } else {
      const p = dbContent.rows[0];
      console.log(`ID: ${p.id}`);
      console.log(`Title: "${p.title}"`);
      console.log(`User Type: ${p.user_type}`);
      console.log(`Language: ${p.language}`);
      console.log(`Created: ${new Date(p.created_at).toLocaleString('th-TH')}`);
      if (p.updated_at) {
        console.log(`Updated: ${new Date(p.updated_at).toLocaleString('th-TH')}`);
      }
      console.log('\nContent ในฐานข้อมูล:');
      console.log('-'.repeat(60));
      console.log(p.content);
      console.log('-'.repeat(60));
    }
    
    // 2. ทดสอบ API endpoint
    console.log('\n2️⃣ API - ทดสอบ API endpoint:\n');
    console.log('URL: http://localhost:3000/api/simple-policy/active?userType=customer&language=th');
    
    try {
      const apiResponse = await axios.get(
        'http://localhost:3000/api/simple-policy/active?userType=customer&language=th'
      );
      
      if (apiResponse.data.success && apiResponse.data.data) {
        const data = apiResponse.data.data;
        console.log('✅ API Response:');
        console.log(`Title: "${data.title}"`);
        console.log(`User Type: ${data.user_type}`);
        console.log(`Language: ${data.language}`);
        console.log('\nContent ที่ API ส่ง:');
        console.log('-'.repeat(60));
        console.log(data.content);
        console.log('-'.repeat(60));
      } else {
        console.log('❌ API ไม่ส่งข้อมูลกลับมา');
      }
    } catch (err) {
      console.log(`❌ API Error: ${err.message}`);
      console.log('⚠️ Backend อาจไม่ทำงาน - ลองรัน: npm run dev');
    }
    
    // 3. ตรวจสอบ Frontend
    console.log('\n3️⃣ FRONTEND - วิธีที่ Frontend แสดงเนื้อหา:\n');
    console.log('Frontend (ConsentFlowPage.js) จะ:');
    console.log('1. เรียก API: /api/simple-policy/active?userType=customer&language=th');
    console.log('2. รับ response.data.data.content');
    console.log('3. แสดงผ่าน dangerouslySetInnerHTML');
    console.log('\nถ้าเนื้อหาไม่แสดง อาจเป็นเพราะ:');
    console.log('- Browser cache เก่า → กด Ctrl+F5');
    console.log('- API ส่ง content ผิด → ดู console (F12)');
    console.log('- Language/UserType ไม่ match');
    
    // 4. อัพเดทเนื้อหาใหม่เพื่อทดสอบ
    console.log('\n4️⃣ UPDATE - อัพเดทเนื้อหาใหม่:\n');
    
    const newContent = `<h1>เนื้อหาใหม่ที่ Admin สร้าง</h1>
<p>อัพเดทเมื่อ: ${new Date().toLocaleString('th-TH')}</p>
<h2>นโยบายความเป็นส่วนตัว</h2>
<p>นี่คือเนื้อหาที่ Admin พิมพ์ในหน้า Create Policy</p>
<ul>
  <li>ข้อ 1: เก็บข้อมูลอย่างปลอดภัย</li>
  <li>ข้อ 2: ใช้ข้อมูลเพื่อปรับปรุงบริการ</li>
  <li>ข้อ 3: ไม่เปิดเผยข้อมูลแก่บุคคลที่สาม</li>
</ul>`;
    
    await client.query(`
      UPDATE policy_versions 
      SET content = $1, updated_at = NOW()
      WHERE user_type = 'customer' AND language = 'th' AND is_active = true
    `, [newContent]);
    
    console.log('✅ อัพเดทเนื้อหาใหม่แล้ว');
    console.log('\nเนื้อหาใหม่:');
    console.log('-'.repeat(60));
    console.log(newContent);
    console.log('-'.repeat(60));
    
    console.log('\n' + '='.repeat(80));
    console.log('\n✅ สรุป:\n');
    console.log('1. Database มีเนื้อหาใหม่แล้ว');
    console.log('2. API endpoint: /api/simple-policy/active?userType=customer&language=th');
    console.log('3. ทดสอบที่: http://localhost:5000/consent/customer?lang=th');
    console.log('4. กด Ctrl+F5 เพื่อ clear cache');
    console.log('\n⚠️ ถ้ายังไม่เห็นเนื้อหาใหม่:');
    console.log('- Restart backend: Ctrl+C แล้ว npm run dev');
    console.log('- ดู Console (F12) ว่ามี error ไหม');
    console.log('- ดู Network tab ว่า API response เป็นอะไร');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

debugContentFlow();
