const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'consent',
  user: 'postgres',
  password: '4321'
});

async function checkAndFixPolicies() {
  try {
    console.log('🔍 ตรวจสอบและแก้ไข Policies...\n');
    
    // 1. ดูข้อมูลปัจจุบัน
    console.log('📋 Policies ปัจจุบัน:');
    const current = await pool.query(`
      SELECT id, user_type, language, title, version
      FROM policy_versions
      ORDER BY version
    `);
    
    current.rows.forEach(p => {
      console.log(`[${p.version}] userType: ${p.user_type} | ${p.language} | ${p.title}`);
    });
    
    // 2. แก้ไข userType ตาม version
    console.log('\n🔧 แก้ไข userType:');
    
    // 001 = customer Thai
    await pool.query(
      "UPDATE policy_versions SET user_type = 'customer' WHERE version = '001'"
    );
    console.log("✅ 001 -> customer");
    
    // 002 = customer English
    await pool.query(
      "UPDATE policy_versions SET user_type = 'customer' WHERE version = '002'"
    );
    console.log("✅ 002 -> customer");
    
    // 003 = employee Thai
    await pool.query(
      "UPDATE policy_versions SET user_type = 'employee' WHERE version = '003'"
    );
    console.log("✅ 003 -> employee");
    
    // 3. ตรวจสอบผลลัพธ์
    console.log('\n📊 ผลลัพธ์หลังแก้ไข:');
    const fixed = await pool.query(`
      SELECT id, user_type, language, title, version
      FROM policy_versions
      ORDER BY version
    `);
    
    fixed.rows.forEach(p => {
      let link = '';
      if (p.user_type === 'customer') {
        link = '/consent/select-language';
      } else {
        const lang = p.language === 'th-TH' ? 'th' : 'en';
        link = `/consent/${p.user_type}?lang=${lang}`;
      }
      console.log(`[${p.version}] ${p.user_type} | ${p.language} | Link: ${link}`);
    });
    
    console.log('\n✅ แก้ไขเสร็จสิ้น!');
    console.log('\n📌 ลิงก์ที่ถูกต้อง:');
    console.log('001 (customer Thai): /consent/select-language');
    console.log('002 (customer English): /consent/select-language');
    console.log('003 (employee Thai): /consent/employee?lang=th');
    console.log('\nรีเฟรชหน้า Policy Management เพื่อดูผล');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkAndFixPolicies();
