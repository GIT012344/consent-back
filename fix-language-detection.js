const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '4321',
  database: process.env.DB_NAME || 'consent'
});

async function fixLanguageDetection() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 แก้ไขปัญหาภาษา\n');
    
    // Check current data
    const checkData = await client.query(`
      SELECT id, user_type, language, title 
      FROM policy_versions 
      WHERE user_type = 'customer' AND is_active = true
      ORDER BY id
    `);
    
    console.log('ข้อมูลปัจจุบัน:');
    checkData.rows.forEach(row => {
      console.log(`  ID ${row.id}: ${row.user_type}/${row.language} = "${row.title}"`);
    });
    
    // Fix language values based on title
    console.log('\nกำลังแก้ไข...');
    
    // Update 001 to be Thai
    await client.query(`
      UPDATE policy_versions 
      SET language = 'th'
      WHERE title = '001' AND user_type = 'customer'
    `);
    console.log('✅ Updated 001 to Thai (th)');
    
    // Update 002 to be English  
    await client.query(`
      UPDATE policy_versions 
      SET language = 'en'
      WHERE title = '002' AND user_type = 'customer'
    `);
    console.log('✅ Updated 002 to English (en)');
    
    // Verify the fix
    const verifyData = await client.query(`
      SELECT id, user_type, language, title 
      FROM policy_versions 
      WHERE user_type = 'customer' AND is_active = true
      ORDER BY language
    `);
    
    console.log('\nผลลัพธ์หลังแก้ไข:');
    verifyData.rows.forEach(row => {
      console.log(`  ${row.user_type}/${row.language}: "${row.title}"`);
    });
    
    console.log('\n✅ แก้ไขเสร็จสิ้น!');
    console.log('ทดสอบได้ที่:');
    console.log('  Thai: http://localhost:5000/consent/customer?lang=th (ควรเห็น 001)');
    console.log('  English: http://localhost:5000/consent/customer?lang=en (ควรเห็น 002)');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

fixLanguageDetection();
