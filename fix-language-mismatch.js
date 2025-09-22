const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '4321',
  database: 'consent'
});

async function fixLanguageMismatch() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 แก้ไข Language Format Mismatch\n');
    console.log('='.repeat(80));
    
    // 1. แก้ไข language format ให้เป็น th แทน th-TH
    console.log('1. แก้ไข Language Format:\n');
    
    await client.query(`
      UPDATE policy_versions 
      SET language = 'th'
      WHERE language = 'th-TH' OR language = 'ภาษาไทย'
    `);
    console.log('✅ แปลง th-TH → th');
    
    await client.query(`
      UPDATE policy_versions 
      SET language = 'en'
      WHERE language = 'en-US' OR language = 'English'
    `);
    console.log('✅ แปลง en-US → en');
    
    // 2. ลบ duplicates - เก็บแค่ล่าสุด
    console.log('\n2. ลบ Duplicates:\n');
    
    await client.query(`
      DELETE FROM policy_versions
      WHERE id NOT IN (
        SELECT DISTINCT ON (user_type, language) id
        FROM policy_versions
        WHERE is_active = true
        ORDER BY user_type, language, created_at DESC
      )
    `);
    console.log('✅ ลบ duplicates แล้ว');
    
    // 3. อัพเดทเนื้อหาให้ถูกต้อง
    console.log('\n3. อัพเดทเนื้อหา:\n');
    
    const updateResult = await client.query(`
      UPDATE policy_versions 
      SET content = $1,
          title = '001',
          version = '1.0.0',
          updated_at = NOW()
      WHERE user_type = 'customer' AND language = 'th'
      RETURNING id
    `, [`<h1>นโยบายความเป็นส่วนตัว</h1>
<p>นโยบายเลือกข้อหาม</p>
<p>ผลิตภัณฑ์นี้ความเอาผา</p>
<p>อำพลสนุยมความยอมพใจ</p>`]);
    
    if (updateResult.rows.length > 0) {
      console.log(`✅ อัพเดท Policy ID ${updateResult.rows[0].id}`);
    } else {
      // ถ้าไม่มี ให้สร้างใหม่
      const insertResult = await client.query(`
        INSERT INTO policy_versions (
          title, user_type, language, version, content, is_active
        ) VALUES (
          '001', 'customer', 'th', '1.0.0', $1, true
        ) RETURNING id
      `, [`<h1>นโยบายความเป็นส่วนตัว</h1>
<p>นโยบายเลือกข้อหาม</p>
<p>ผลิตภัณฑ์นี้ความเอาผา</p>
<p>อำพลสนุยมความยอมพใจ</p>`]);
      console.log(`✅ สร้าง Policy ID ${insertResult.rows[0].id}`);
    }
    
    // 4. ตรวจสอบผลลัพธ์
    console.log('\n4. ตรวจสอบผลลัพธ์:\n');
    
    const final = await client.query(`
      SELECT id, user_type, language, title, is_active
      FROM policy_versions
      WHERE is_active = true
      ORDER BY user_type, language
    `);
    
    console.log('Policies ที่พร้อมใช้:');
    final.rows.forEach(p => {
      console.log(`• ID ${p.id}: ${p.user_type}/${p.language} = "${p.title}"`);
    });
    
    console.log('\n' + '='.repeat(80));
    console.log('\n✅ แก้ไขเสร็จแล้ว!\n');
    console.log('ทดสอบ: http://localhost:5000/consent/customer?lang=th');
    console.log('กด Ctrl+F5 เพื่อ refresh');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

fixLanguageMismatch();
