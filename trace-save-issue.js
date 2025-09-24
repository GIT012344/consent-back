const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '4321',
  database: 'consent'
});

async function traceSaveIssue() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 ติดตามปัญหาการบันทึกและแสดงเนื้อหา\n');
    console.log('='.repeat(80));
    
    // 1. ดูข้อมูลล่าสุดที่บันทึก
    console.log('📊 ข้อมูลล่าสุดในฐานข้อมูล:\n');
    const latest = await client.query(`
      SELECT id, user_type, language, title, content, 
             created_at, updated_at
      FROM policy_versions
      WHERE title LIKE '%นโยบายความเป็นส่วนตัว%' 
         OR title LIKE '%consent%'
         OR user_type = 'customer'
      ORDER BY created_at DESC
      LIMIT 5
    `);
    
    if (latest.rows.length === 0) {
      console.log('❌ ไม่พบข้อมูลที่บันทึกจากหน้า Admin');
    } else {
      latest.rows.forEach((p, i) => {
        console.log(`${i+1}. Policy ID ${p.id}:`);
        console.log(`   Title: "${p.title}"`);
        console.log(`   User Type: ${p.user_type}`);
        console.log(`   Language: ${p.language}`);
        console.log(`   Created: ${new Date(p.created_at).toLocaleString('th-TH')}`);
        console.log(`   Content ที่บันทึก:`);
        console.log('   ' + '-'.repeat(60));
        console.log(`   ${p.content}`);
        console.log('   ' + '-'.repeat(60));
        console.log('');
      });
    }
    
    // 2. ทดสอบบันทึกข้อมูลใหม่
    console.log('🧪 ทดสอบบันทึกข้อมูลใหม่:\n');
    
    const testContent = '<p>เนื้อหา consent ที่จะแสดงให้ผู้ใช้อ่าน...</p>';
    
    // Check if exists
    const check = await client.query(`
      SELECT id FROM policy_versions 
      WHERE title = 'นโยบายความเป็นส่วนตัว' 
        AND user_type = 'customer' 
        AND language = 'th'
    `);
    
    if (check.rows.length > 0) {
      // Update existing
      await client.query(`
        UPDATE policy_versions 
        SET content = $1, updated_at = NOW()
        WHERE id = $2
      `, [testContent, check.rows[0].id]);
      console.log(`✅ อัพเดท Policy ID ${check.rows[0].id}`);
    } else {
      // Create new
      const result = await client.query(`
        INSERT INTO policy_versions (
          title, user_type, language, version, content, is_active
        ) VALUES (
          'นโยบายความเป็นส่วนตัว', 
          'customer', 
          'th', 
          '1.0.0',
          $1,
          true
        ) RETURNING id
      `, [testContent]);
      console.log(`✅ สร้าง Policy ใหม่ ID ${result.rows[0].id}`);
    }
    
    // 3. ตรวจสอบว่าบันทึกสำเร็จ
    const verify = await client.query(`
      SELECT content FROM policy_versions 
      WHERE title = 'นโยบายความเป็นส่วนตัว' 
        AND user_type = 'customer' 
        AND language = 'th'
    `);
    
    if (verify.rows.length > 0) {
      console.log('\n✅ บันทึกสำเร็จ! เนื้อหาที่บันทึก:');
      console.log(verify.rows[0].content);
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('\n💡 วิธีแก้ไข:\n');
    console.log('จากภาพที่คุณส่งมา คุณกำลังสร้าง:');
    console.log('- ภาษา: ภาษาไทย');
    console.log('- User Type: ลูกค้า');
    console.log('- Title: นโยบายความเป็นส่วนตัว');
    console.log('- Content: เนื้อหา consent ที่จะแสดงให้ผู้ใช้อ่าน...');
    console.log('\nเมื่อกด Save แล้ว ระบบจะบันทึกใน policy_versions table');
    console.log('และเมื่อเข้า http://localhost:5000/consent/customer?lang=th');
    console.log('จะแสดงเนื้อหาที่คุณพิมพ์ไว้');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

traceSaveIssue();
