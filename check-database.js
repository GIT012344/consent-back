const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'consent',
  user: 'postgres',
  password: '4321'
});

async function checkDatabase() {
  try {
    console.log('🔍 ตรวจสอบข้อมูลในฐานข้อมูล...\n');
    
    const result = await pool.query(`
      SELECT id, user_type, language, title, version, is_active
      FROM policy_versions 
      ORDER BY id DESC
    `);
    
    console.log('📋 Policies ทั้งหมด:');
    console.log('===================');
    
    result.rows.forEach(p => {
      console.log(`ID: ${p.id}`);
      console.log(`  UserType: ${p.user_type}`);
      console.log(`  Language: ${p.language}`);
      console.log(`  Title: ${p.title}`);
      console.log(`  Version: ${p.version}`);
      console.log(`  Active: ${p.is_active}`);
      console.log('---');
    });
    
    console.log(`\nรวมทั้งหมด: ${result.rows.length} policies`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkDatabase();
