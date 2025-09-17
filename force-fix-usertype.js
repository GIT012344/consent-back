const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'consent',
  user: 'postgres',
  password: '4321'
});

async function forceFixUserType() {
  try {
    console.log('🔧 บังคับแก้ไข UserType...\n');
    
    // 1. ดูข้อมูลปัจจุบัน
    console.log('📋 ข้อมูลก่อนแก้ไข:');
    const before = await pool.query(`
      SELECT id, version, user_type, language, title
      FROM policy_versions
      WHERE version IN ('001', '002', '003')
      ORDER BY version
    `);
    
    before.rows.forEach(p => {
      console.log(`${p.version}: userType="${p.user_type}" | ${p.language}`);
    });
    
    // 2. บังคับแก้ไข version 003 ให้เป็น employee
    console.log('\n🔧 แก้ไข:');
    
    // แก้ไข 003 ให้เป็น employee แน่นอน
    const update003 = await pool.query(`
      UPDATE policy_versions 
      SET user_type = 'employee'
      WHERE version = '003'
      RETURNING *
    `);
    
    if (update003.rows.length > 0) {
      console.log(`✅ แก้ไข 003 -> employee (${update003.rows[0].title})`);
    }
    
    // ตรวจสอบ 001 และ 002 ให้เป็น customer
    await pool.query(`
      UPDATE policy_versions 
      SET user_type = 'customer'
      WHERE version IN ('001', '002')
    `);
    console.log('✅ แก้ไข 001, 002 -> customer');
    
    // 3. ตรวจสอบผลลัพธ์
    console.log('\n📊 ผลลัพธ์หลังแก้ไข:');
    const after = await pool.query(`
      SELECT version, user_type, language, title
      FROM policy_versions
      WHERE version IN ('001', '002', '003')
      ORDER BY version
    `);
    
    console.log('\nVersion | UserType | Link');
    console.log('--------|----------|-----');
    after.rows.forEach(p => {
      let link = '';
      if (p.user_type === 'customer') {
        link = 'http://localhost:3003/consent/select-language';
      } else if (p.user_type === 'employee') {
        const lang = p.language === 'th-TH' ? 'th' : 'en';
        link = `http://localhost:3003/consent/employee?lang=${lang}`;
      }
      console.log(`${p.version}    | ${p.user_type.padEnd(8)} | ${link}`);
    });
    
    console.log('\n✅ แก้ไขเสร็จสิ้น!');
    console.log('\n⚠️ ต้องทำทันที:');
    console.log('1. รีสตาร์ท Backend (Ctrl+C แล้ว node server.js)');
    console.log('2. Hard Refresh หน้า Policy Management (Ctrl+Shift+R)');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

forceFixUserType();
