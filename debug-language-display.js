const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '4321',
  database: 'consent'
});

async function debugLanguageDisplay() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 ตรวจสอบปัญหาการแสดงภาษา\n');
    console.log('='.repeat(80));
    
    // 1. ดู policies ทั้งหมด
    console.log('1. Policies ในฐานข้อมูล:\n');
    const policies = await client.query(`
      SELECT id, user_type, language, title, created_at
      FROM policy_versions
      WHERE is_active = true
      ORDER BY created_at DESC
    `);
    
    policies.rows.forEach(p => {
      const langDisplay = p.language === 'th' ? '🇹🇭 ภาษาไทย' : 
                         p.language === 'en' ? 'English' :
                         p.language === 'th-TH' ? '🇹🇭 ภาษาไทย (th-TH)' :
                         p.language === 'en-US' ? 'English (en-US)' : p.language;
      
      console.log(`ID ${p.id}: ${p.user_type}/${p.language} = "${p.title}"`);
      console.log(`   Language: ${langDisplay}`);
      console.log(`   Created: ${new Date(p.created_at).toLocaleString('th-TH')}`);
      console.log('');
    });
    
    // 2. ตรวจสอบ policy ล่าสุด
    console.log('2. Policy ล่าสุดที่สร้าง:\n');
    const latest = await client.query(`
      SELECT * FROM policy_versions
      ORDER BY created_at DESC
      LIMIT 1
    `);
    
    if (latest.rows.length > 0) {
      const p = latest.rows[0];
      console.log(`ID: ${p.id}`);
      console.log(`Title: ${p.title}`);
      console.log(`User Type: ${p.user_type}`);
      console.log(`Language in DB: "${p.language}"`);
      console.log(`Expected: "th" for Thai, "en" for English`);
      
      if (p.language !== 'th' && p.language !== 'en') {
        console.log('\n⚠️ Language format ไม่ถูกต้อง!');
        console.log(`   Found: "${p.language}"`);
        console.log('   Should be: "th" or "en"');
      }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('\n💡 วิธีแก้ไข:\n');
    console.log('ปัญหาคือ language ถูกบันทึกเป็น format ผิด');
    console.log('- ควรเป็น: "th" หรือ "en"');
    console.log('- แต่อาจถูกบันทึกเป็น: "th-TH", "en-US", "ภาษาไทย", "English"');
    console.log('\nเมื่อสร้าง Policy ใหม่:');
    console.log('- เลือก "🇹🇭 ภาษาไทย" → จะบันทึกเป็น "th"');
    console.log('- เลือก "English" → จะบันทึกเป็น "en"');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

debugLanguageDisplay();
