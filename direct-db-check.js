const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'consent',
  user: 'postgres',
  password: '4321'
});

async function directDbCheck() {
  try {
    // ดูข้อมูลในฐานข้อมูลโดยตรง
    const result = await pool.query('SELECT * FROM policy_versions');
    
    console.log('📋 ข้อมูลในฐานข้อมูล:');
    console.log('====================\n');
    
    if (result.rows.length === 0) {
      console.log('❌ ไม่มีข้อมูล!');
      console.log('\nสร้างใหม่ที่: http://localhost:3003/admin/create-policy');
    } else {
      result.rows.forEach(row => {
        console.log(`ID: ${row.id}`);
        console.log(`Version: ${row.version}`);
        console.log(`UserType: ${row.user_type}`);
        console.log(`Language: ${row.language}`);
        console.log(`Title: ${row.title}`);
        console.log(`Active: ${row.is_active}`);
        console.log(`Content:`);
        console.log(row.content);
        console.log('\n----------------------------\n');
      });
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

directDbCheck();
