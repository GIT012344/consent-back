const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'consent',
  user: 'postgres',
  password: '4321'
});

async function directFixDb() {
  try {
    console.log('🔧 แก้ไขโดยตรงในฐานข้อมูล...\n');
    
    // แก้ไขโดยตรงตาม version
    await pool.query(`
      UPDATE policy_versions 
      SET user_type = CASE
        WHEN version = '001' THEN 'customer'
        WHEN version = '002' THEN 'customer'
        WHEN version = '003' THEN 'employee'
        ELSE user_type
      END
    `);
    
    // ตรวจสอบผลลัพธ์
    const result = await pool.query(`
      SELECT version, user_type, language, title
      FROM policy_versions
      ORDER BY version
    `);
    
    console.log('✅ แก้ไขเสร็จ:\n');
    result.rows.forEach(p => {
      let link = p.user_type === 'customer' 
        ? '/consent/select-language'
        : `/consent/${p.user_type}?lang=${p.language === 'th-TH' ? 'th' : 'en'}`;
      console.log(`${p.version}: ${p.user_type} | ${link}`);
    });
    
    console.log('\nรีสตาร์ท backend และรีเฟรชหน้า Policy Management');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

directFixDb();
