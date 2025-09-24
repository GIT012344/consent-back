const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '4321',
  database: 'consent'
});

async function fixContentSaveDisplay() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 แก้ไขปัญหาการบันทึกและแสดงเนื้อหา\n');
    console.log('='.repeat(80));
    
    // 1. ดูว่า language format ที่บันทึกเป็นอะไร
    console.log('1. ตรวจสอบ Language Format:\n');
    const langCheck = await client.query(`
      SELECT DISTINCT language, COUNT(*) as count
      FROM policy_versions
      WHERE is_active = true
      GROUP BY language
    `);
    
    langCheck.rows.forEach(l => {
      console.log(`   Language: "${l.language}" มี ${l.count} policies`);
    });
    
    // 2. แก้ไข language format ให้ตรงกัน
    console.log('\n2. แก้ไข Language Format:\n');
    
    // แปลง th-TH เป็น th
    await client.query(`
      UPDATE policy_versions 
      SET language = 'th'
      WHERE language = 'th-TH' OR language = 'ภาษาไทย'
    `);
    console.log('   ✅ แปลง th-TH/ภาษาไทย → th');
    
    // แปลง en-US เป็น en
    await client.query(`
      UPDATE policy_versions 
      SET language = 'en'
      WHERE language = 'en-US' OR language = 'English'
    `);
    console.log('   ✅ แปลง en-US/English → en');
    
    // 3. ตรวจสอบ user_type format
    console.log('\n3. ตรวจสอบ User Type:\n');
    const userTypeCheck = await client.query(`
      SELECT DISTINCT user_type, COUNT(*) as count
      FROM policy_versions
      WHERE is_active = true
      GROUP BY user_type
    `);
    
    userTypeCheck.rows.forEach(u => {
      console.log(`   User Type: "${u.user_type}" มี ${u.count} policies`);
    });
    
    // แก้ไข user_type ให้เป็น lowercase
    await client.query(`
      UPDATE policy_versions 
      SET user_type = LOWER(user_type)
    `);
    console.log('   ✅ แปลง user_type เป็น lowercase');
    
    // 4. ดู policies ที่มีอยู่
    console.log('\n4. Policies ที่มีอยู่:\n');
    const policies = await client.query(`
      SELECT id, user_type, language, title, 
             LEFT(content, 100) as content_preview
      FROM policy_versions
      WHERE is_active = true
      ORDER BY user_type, language
    `);
    
    policies.rows.forEach(p => {
      console.log(`   ${p.user_type}/${p.language}: "${p.title}"`);
      console.log(`   Content: ${p.content_preview}...`);
      console.log('');
    });
    
    // 5. สร้าง/อัพเดท policy ตัวอย่าง
    console.log('5. สร้าง/อัพเดท Policy ตัวอย่าง:\n');
    
    // ตรวจสอบว่ามี policy สำหรับ customer/th หรือไม่
    const checkCustomerTh = await client.query(`
      SELECT id FROM policy_versions 
      WHERE user_type = 'customer' AND language = 'th' AND is_active = true
      LIMIT 1
    `);
    
    if (checkCustomerTh.rows.length > 0) {
      // อัพเดทเนื้อหา
      await client.query(`
        UPDATE policy_versions 
        SET content = $1, title = $2, updated_at = NOW()
        WHERE id = $3
      `, [
        '<h2>นโยบายความเป็นส่วนตัว</h2><p>เนื้อหา consent ที่จะแสดงให้ผู้ใช้อ่าน...</p><p>นี่คือเนื้อหาที่ Admin พิมพ์ในหน้า Create Policy</p>',
        'นโยบายความเป็นส่วนตัว',
        checkCustomerTh.rows[0].id
      ]);
      console.log('   ✅ อัพเดท customer/th policy');
    } else {
      // สร้างใหม่
      await client.query(`
        INSERT INTO policy_versions (
          title, user_type, language, version, content, is_active
        ) VALUES (
          'นโยบายความเป็นส่วนตัว',
          'customer',
          'th',
          '1.0.0',
          '<h2>นโยบายความเป็นส่วนตัว</h2><p>เนื้อหา consent ที่จะแสดงให้ผู้ใช้อ่าน...</p><p>นี่คือเนื้อหาที่ Admin พิมพ์ในหน้า Create Policy</p>',
          true
        )
      `);
      console.log('   ✅ สร้าง customer/th policy ใหม่');
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('\n✅ แก้ไขเสร็จสิ้น!\n');
    console.log('📝 วิธีใช้งาน:');
    console.log('1. ไปที่: http://localhost:5000/admin/create-policy');
    console.log('2. กรอกข้อมูล:');
    console.log('   - ภาษา: เลือก "ภาษาไทย" หรือ "th-TH"');
    console.log('   - User Type: เลือก "ลูกค้า" หรือ "customer"');
    console.log('   - Title: นโยบายความเป็นส่วนตัว');
    console.log('   - Content: พิมพ์เนื้อหาที่ต้องการแสดง');
    console.log('3. กด "สร้าง Policy"');
    console.log('\n🔗 ทดสอบ:');
    console.log('http://localhost:5000/consent/customer?lang=th');
    console.log('→ จะแสดงเนื้อหาที่คุณพิมพ์ไว้');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

fixContentSaveDisplay();
