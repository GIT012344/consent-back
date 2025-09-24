const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '4321',
  database: 'consent'
});

async function forceFixLanguageMapping() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 บังคับแก้ไขการแมพภาษา\n');
    
    // 1. แก้ title 01 เป็น 001
    await client.query(`
      UPDATE policy_versions 
      SET title = '001', language = 'th'
      WHERE (title = '01' OR title = '001') 
        AND user_type = 'customer'
        AND id = (
          SELECT id FROM policy_versions 
          WHERE user_type = 'customer' AND (title = '01' OR title = '001')
          ORDER BY id LIMIT 1
        )
    `);
    
    // 2. แก้ 002 ให้เป็น English
    await client.query(`
      UPDATE policy_versions 
      SET language = 'en'
      WHERE title = '002' AND user_type = 'customer'
    `);
    
    // 3. แก้ 003 ให้เป็น Thai
    await client.query(`
      UPDATE policy_versions 
      SET language = 'th'
      WHERE title = '003' AND user_type = 'employee'
    `);
    
    // แสดงผล
    const result = await client.query(`
      SELECT id, user_type, language, title 
      FROM policy_versions 
      WHERE is_active = true
      ORDER BY id
    `);
    
    console.log('✅ แก้ไขเสร็จ:\n');
    result.rows.forEach(row => {
      console.log(`ID ${row.id}: ${row.user_type}/${row.language} = "${row.title}"`);
    });
    
    console.log('\n✅ ระบบพร้อม!');
    console.log('ลูกค้าไทย (lang=th) → 001');
    console.log('ลูกค้าอังกฤษ (lang=en) → 002');
    console.log('พนักงานไทย (lang=th) → 003');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

forceFixLanguageMapping();
