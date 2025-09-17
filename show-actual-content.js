const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'consent',
  user: 'postgres',
  password: '4321'
});

async function showActualContent() {
  try {
    console.log('📋 แสดงเนื้อหา Policy ที่มีอยู่จริงในฐานข้อมูล:\n');
    console.log('=================================================\n');
    
    const result = await pool.query(`
      SELECT id, version, user_type, language, title, content, created_at
      FROM policy_versions
      ORDER BY created_at DESC, version
    `);
    
    if (result.rows.length === 0) {
      console.log('❌ ไม่มี policies ในฐานข้อมูล');
      console.log('\n💡 กรุณาสร้าง policy ใหม่ผ่าน:');
      console.log('   http://localhost:3003/admin/create-policy');
      return;
    }
    
    console.log(`พบ ${result.rows.length} policies:\n`);
    
    result.rows.forEach((p, index) => {
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`Policy #${index + 1}`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`ID: ${p.id}`);
      console.log(`Version: ${p.version}`);
      console.log(`UserType: ${p.user_type}`);
      console.log(`Language: ${p.language}`);
      console.log(`Title: ${p.title}`);
      console.log(`Created: ${p.created_at}`);
      console.log(`\nContent (เนื้อหาที่คุณสร้าง):`);
      console.log('---');
      console.log(p.content);
      console.log('---\n');
      
      // แสดงลิงก์ที่ควรใช้
      let link = '';
      if (p.user_type === 'customer') {
        link = 'http://localhost:3003/consent/select-language';
        if (p.language === 'th-TH') {
          link += ' → เลือก "ภาษาไทย"';
        } else if (p.language === 'en-US') {
          link += ' → เลือก "English"';
        }
      } else {
        const lang = p.language === 'th-TH' ? 'th' : 'en';
        link = `http://localhost:3003/consent/${p.user_type}?lang=${lang}`;
      }
      console.log(`🔗 Link: ${link}`);
      console.log('');
    });
    
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    console.log('📌 วิธีแก้ไขเนื้อหา:');
    console.log('1. แก้ไขผ่าน Admin Panel');
    console.log('2. หรือสร้างใหม่ผ่าน http://localhost:3003/admin/create-policy');
    console.log('\n⚠️ เนื้อหาที่แสดงในลิงก์จะเป็นเนื้อหาที่อยู่ในฐานข้อมูลนี้');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

showActualContent();
