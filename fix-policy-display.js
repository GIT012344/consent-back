const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'consent',
  user: 'postgres',
  password: '4321'
});

async function fixPolicyDisplay() {
  try {
    console.log('🔧 แก้ไข Policy Display Issue...\n');
    
    // 1. ตรวจสอบข้อมูลปัจจุบัน
    console.log('📋 ข้อมูลปัจจุบันในฐานข้อมูล:');
    const current = await pool.query(`
      SELECT id, version, title, language, user_type
      FROM policy_versions
      ORDER BY version
    `);
    
    console.log('พบ', current.rows.length, 'policies:');
    current.rows.forEach(p => {
      console.log(`Version ${p.version}: userType="${p.user_type}" | ${p.language} | ${p.title}`);
    });
    
    // 2. แก้ไขตาม version number
    console.log('\n🔧 แก้ไข userType ตาม version:');
    
    // ตรวจสอบและแก้ไข version 001 - ควรเป็น customer
    const v001 = await pool.query("SELECT * FROM policy_versions WHERE version = '001'");
    if (v001.rows.length > 0) {
      await pool.query("UPDATE policy_versions SET user_type = 'customer', language = 'th-TH' WHERE version = '001'");
      console.log('✅ 001 -> customer (Thai)');
    }
    
    // ตรวจสอบและแก้ไข version 002 - ควรเป็น customer 
    const v002 = await pool.query("SELECT * FROM policy_versions WHERE version = '002'");
    if (v002.rows.length > 0) {
      await pool.query("UPDATE policy_versions SET user_type = 'customer', language = 'en-US' WHERE version = '002'");
      console.log('✅ 002 -> customer (English)');
    }
    
    // ตรวจสอบและแก้ไข version 003 - ควรเป็น employee
    const v003 = await pool.query("SELECT * FROM policy_versions WHERE version = '003'");
    if (v003.rows.length > 0) {
      await pool.query("UPDATE policy_versions SET user_type = 'employee', language = 'th-TH' WHERE version = '003'");
      console.log('✅ 003 -> employee (Thai)');
    }
    
    // 3. ตรวจสอบผลลัพธ์
    console.log('\n📊 ผลลัพธ์หลังแก้ไข:');
    const fixed = await pool.query(`
      SELECT version, user_type, language, title
      FROM policy_versions
      ORDER BY version
    `);
    
    console.log('\nVersion | UserType  | Language | Link');
    console.log('--------|-----------|----------|-----');
    fixed.rows.forEach(p => {
      let link = '';
      if (p.user_type === 'customer') {
        link = 'http://localhost:3003/consent/select-language';
      } else {
        const lang = p.language === 'th-TH' ? 'th' : 'en';
        link = `http://localhost:3003/consent/${p.user_type}?lang=${lang}`;
      }
      console.log(`${p.version}    | ${p.user_type.padEnd(9)} | ${p.language.padEnd(8)} | ${link}`);
    });
    
    console.log('\n✅ แก้ไขเสร็จสิ้น!');
    console.log('\n⚠️ สิ่งที่ต้องทำ:');
    console.log('1. รีสตาร์ท Backend (Ctrl+C แล้ว node server.js)');
    console.log('2. รีเฟรชหน้า Policy Management (Ctrl+F5)');
    console.log('\nลิงก์จะแสดงถูกต้อง:');
    console.log('- 001, 002 (customer) -> /consent/select-language');
    console.log('- 003 (employee) -> /consent/employee?lang=th');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

fixPolicyDisplay();
