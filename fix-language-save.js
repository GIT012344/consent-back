const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '4321',
  database: 'consent'
});

async function fixLanguageSave() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 แก้ไขการบันทึกภาษาให้ถูกต้อง\n');
    console.log('='.repeat(80));
    
    // 1. ดู policies ที่มีอยู่
    console.log('1. Policies ปัจจุบัน:\n');
    const current = await client.query(`
      SELECT id, user_type, language, title
      FROM policy_versions
      WHERE is_active = true
      ORDER BY created_at DESC
    `);
    
    current.rows.forEach(p => {
      console.log(`ID ${p.id}: ${p.user_type}/${p.language} = "${p.title}"`);
      if (p.language !== 'th' && p.language !== 'en') {
        console.log(`   ⚠️ Language format ผิด!`);
      }
    });
    
    // 2. แก้ไข policies ที่มี language format ผิด
    console.log('\n2. แก้ไข Language Format:\n');
    
    // แก้ policies ที่เป็น th-TH หรือ ภาษาไทย
    const fixThai = await client.query(`
      UPDATE policy_versions 
      SET language = 'th'
      WHERE (language = 'th-TH' OR language = 'ภาษาไทย' OR language LIKE '%ไทย%')
        AND is_active = true
      RETURNING id, title
    `);
    
    if (fixThai.rows.length > 0) {
      console.log(`✅ แก้ไข ${fixThai.rows.length} policies เป็น 'th'`);
      fixThai.rows.forEach(p => console.log(`   - ID ${p.id}: ${p.title}`));
    }
    
    // แก้ policies ที่เป็น en-US หรือ English
    const fixEng = await client.query(`
      UPDATE policy_versions 
      SET language = 'en'
      WHERE (language = 'en-US' OR language = 'English' OR language LIKE '%Eng%')
        AND is_active = true
      RETURNING id, title
    `);
    
    if (fixEng.rows.length > 0) {
      console.log(`✅ แก้ไข ${fixEng.rows.length} policies เป็น 'en'`);
      fixEng.rows.forEach(p => console.log(`   - ID ${p.id}: ${p.title}`));
    }
    
    // 3. ตรวจสอบผลลัพธ์
    console.log('\n3. ผลลัพธ์หลังแก้ไข:\n');
    const result = await client.query(`
      SELECT user_type, language, title
      FROM policy_versions
      WHERE is_active = true
      ORDER BY user_type, language
    `);
    
    result.rows.forEach(p => {
      const icon = p.language === 'th' ? '🇹🇭' : p.language === 'en' ? '🇬🇧' : '❓';
      console.log(`${icon} ${p.user_type}/${p.language}: "${p.title}"`);
    });
    
    console.log('\n' + '='.repeat(80));
    console.log('\n✅ แก้ไขเสร็จแล้ว!\n');
    console.log('การทำงานที่ถูกต้อง:');
    console.log('1. เลือก "🇹🇭 ภาษาไทย" → บันทึกเป็น "th"');
    console.log('2. เลือก "🇬🇧 English" → บันทึกเป็น "en"');
    console.log('\nทดสอบ:');
    console.log('1. สร้าง Policy ใหม่ที่ http://localhost:5000/admin/create-policy');
    console.log('2. ดู Console (F12) จะเห็น log การแปลง language');
    console.log('3. ตรวจสอบใน Policy Management ว่าแสดงถูกต้อง');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

fixLanguageSave();
