const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '4321',
  database: 'consent'
});

async function verifyAndFixLanguage() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 ตรวจสอบและแก้ไขภาษาในฐานข้อมูล\n');
    console.log('='.repeat(80));
    
    // 1. ดู policy ที่มี title "ไม่รับของแพง"
    console.log('1. ตรวจสอบ Policy "ไม่รับของแพง":\n');
    const checkPolicy = await client.query(`
      SELECT id, user_type, language, title, created_at
      FROM policy_versions
      WHERE title = 'ไม่รับของแพง' OR title LIKE '%ไม่รับ%'
      ORDER BY created_at DESC
    `);
    
    if (checkPolicy.rows.length > 0) {
      checkPolicy.rows.forEach(p => {
        console.log(`ID ${p.id}: ${p.user_type}/${p.language}`);
        console.log(`Title: "${p.title}"`);
        console.log(`Language ในฐานข้อมูล: "${p.language}"`);
        
        if (p.language !== 'th' && p.language !== 'en') {
          console.log(`⚠️ Language format ผิด! กำลังแก้ไข...`);
          
          // ถ้า title เป็นภาษาไทย แต่ language ไม่ใช่ 'th'
          if (p.title.match(/[\u0E00-\u0E7F]/)) {
            client.query(`
              UPDATE policy_versions 
              SET language = 'th' 
              WHERE id = $1
            `, [p.id]);
            console.log(`✅ แก้ไขเป็น 'th' แล้ว`);
          }
        }
        console.log('');
      });
    } else {
      console.log('ไม่พบ policy "ไม่รับของแพง"');
    }
    
    // 2. แก้ไข policies ทั้งหมดที่มี language format ผิด
    console.log('2. แก้ไข Language Format ทั้งหมด:\n');
    
    // แก้ Thai policies
    const fixThai = await client.query(`
      UPDATE policy_versions 
      SET language = 'th'
      WHERE language IN ('th-TH', 'ภาษาไทย', 'Thai', 'ไทย')
      RETURNING id, title
    `);
    
    if (fixThai.rows.length > 0) {
      console.log(`✅ แก้ไข ${fixThai.rows.length} Thai policies เป็น 'th'`);
    }
    
    // แก้ English policies  
    const fixEng = await client.query(`
      UPDATE policy_versions 
      SET language = 'en'
      WHERE language IN ('en-US', 'English', 'Eng', 'อังกฤษ')
      RETURNING id, title
    `);
    
    if (fixEng.rows.length > 0) {
      console.log(`✅ แก้ไข ${fixEng.rows.length} English policies เป็น 'en'`);
    }
    
    // 3. แสดงผลลัพธ์
    console.log('\n3. Policies ทั้งหมดหลังแก้ไข:\n');
    const final = await client.query(`
      SELECT user_type, language, title
      FROM policy_versions
      WHERE is_active = true
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    final.rows.forEach(p => {
      const icon = p.language === 'th' ? '🇹🇭' : p.language === 'en' ? '🇬🇧' : '❓';
      const langText = p.language === 'th' ? 'ภาษาไทย' : p.language === 'en' ? 'English' : p.language;
      console.log(`${icon} ${p.user_type}/${p.language} (${langText}): "${p.title}"`);
      
      // แสดง link ที่ถูกต้อง
      const langParam = p.language === 'th' ? 'th' : 'en';
      if (p.user_type === 'customer') {
        console.log(`   Link: /consent/select-language`);
      } else {
        console.log(`   Link: /consent/${p.user_type}?lang=${langParam}`);
      }
    });
    
    console.log('\n' + '='.repeat(80));
    console.log('\n✅ แก้ไขเสร็จแล้ว!');
    console.log('\nตอนนี้:');
    console.log('- Policy ภาษาไทย → language = "th" → link จบด้วย ?lang=th');
    console.log('- Policy English → language = "en" → link จบด้วย ?lang=en');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

verifyAndFixLanguage();
