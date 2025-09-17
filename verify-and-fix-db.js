const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'consent',
  user: 'postgres',
  password: '4321'
});

async function verifyAndFixDb() {
  try {
    console.log('🔍 ตรวจสอบและแก้ไขฐานข้อมูล...\n');
    
    // 1. ดูข้อมูลจริงๆ ในฐานข้อมูล
    const result = await pool.query(`
      SELECT id, version, user_type, language, title
      FROM policy_versions
      ORDER BY version
    `);
    
    console.log('📋 ข้อมูลปัจจุบัน:');
    result.rows.forEach(p => {
      console.log(`[${p.version}] userType="${p.user_type}" | ${p.title}`);
    });
    
    // 2. แก้ไขโดยตรงด้วย SQL
    console.log('\n🔧 แก้ไขโดยตรง:');
    
    // แก้ไข version 003 ให้เป็น employee แน่นอน
    const fix003 = await pool.query(`
      UPDATE policy_versions 
      SET user_type = 'employee'
      WHERE version = '003'
      RETURNING *
    `);
    if (fix003.rows.length > 0) {
      console.log(`✅ แก้ไข 003 -> employee`);
    }
    
    // แก้ไข version 004 ให้เป็น partner แน่นอน
    const fix004 = await pool.query(`
      UPDATE policy_versions 
      SET user_type = 'partner'
      WHERE version = '004'
      RETURNING *
    `);
    if (fix004.rows.length > 0) {
      console.log(`✅ แก้ไข 004 -> partner`);
    }
    
    // 3. ตรวจสอบผลลัพธ์
    console.log('\n📊 ผลลัพธ์หลังแก้ไข:');
    const after = await pool.query(`
      SELECT version, user_type, language, title
      FROM policy_versions
      ORDER BY version
    `);
    
    after.rows.forEach(p => {
      let expectedLink = '';
      if (p.user_type === 'customer') {
        expectedLink = 'http://localhost:3003/consent/select-language';
      } else if (p.user_type === 'employee') {
        expectedLink = 'http://localhost:3003/consent/employee?lang=th';
      } else if (p.user_type === 'partner') {
        expectedLink = 'http://localhost:3003/consent/partner?lang=th';
      }
      console.log(`[${p.version}] ${p.user_type} -> ${expectedLink}`);
    });
    
    console.log('\n✅ แก้ไขเสร็จ!');
    console.log('\n⚠️ รีสตาร์ท Backend แล้วรีเฟรชหน้า Policy Management');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

verifyAndFixDb();
