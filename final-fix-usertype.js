const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'consent',
  user: 'postgres',
  password: '4321'
});

async function finalFixUserType() {
  try {
    console.log('🔧 แก้ไข UserType ครั้งสุดท้าย...\n');
    
    // 1. ดูข้อมูลปัจจุบัน
    console.log('📋 ข้อมูลปัจจุบัน:');
    const current = await pool.query(`
      SELECT id, version, title, language, user_type
      FROM policy_versions
      ORDER BY id
    `);
    
    if (current.rows.length === 0) {
      console.log('❌ ไม่มีข้อมูลในฐานข้อมูล');
      return;
    }
    
    current.rows.forEach(p => {
      console.log(`[ID:${p.id}] Version:${p.version} | UserType:${p.user_type} | ${p.language} | ${p.title}`);
    });
    
    // 2. แก้ไขโดยดูจาก title
    console.log('\n🔧 แก้ไข UserType โดยดูจาก Title:');
    
    for (const policy of current.rows) {
      let correctUserType = policy.user_type;
      
      // ตรวจสอบจาก title หรือ version
      if (policy.title.toLowerCase().includes('พนักงาน') || 
          policy.title.toLowerCase().includes('employee')) {
        correctUserType = 'employee';
      } else if (policy.title.toLowerCase().includes('พันธมิตร') || 
                 policy.title.toLowerCase().includes('partner')) {
        correctUserType = 'partner';
      } else if (policy.title.toLowerCase().includes('ผู้ขาย') || 
                 policy.title.toLowerCase().includes('vendor')) {
        correctUserType = 'vendor';
      } else if (policy.version === '003') {
        // ถ้า version 003 และไม่ใช่ customer ให้เป็น employee
        correctUserType = 'employee';
      } else if (policy.version === '001' || policy.version === '002') {
        // version 001, 002 เป็น customer
        correctUserType = 'customer';
      }
      
      if (correctUserType !== policy.user_type) {
        await pool.query(
          'UPDATE policy_versions SET user_type = $1 WHERE id = $2',
          [correctUserType, policy.id]
        );
        console.log(`✅ แก้ไข ID:${policy.id} จาก ${policy.user_type} -> ${correctUserType}`);
      }
    }
    
    // 3. ตรวจสอบผลลัพธ์
    console.log('\n📊 ผลลัพธ์หลังแก้ไข:');
    const fixed = await pool.query(`
      SELECT id, version, user_type, language, title
      FROM policy_versions
      ORDER BY version
    `);
    
    console.log('\nVersion | UserType  | Language | Title | Link');
    console.log('--------|-----------|----------|-------|-----');
    
    fixed.rows.forEach(p => {
      let link = '';
      if (p.user_type === 'customer') {
        link = '/consent/select-language';
      } else {
        const lang = p.language === 'th-TH' ? 'th' : 'en';
        link = `/consent/${p.user_type}?lang=${lang}`;
      }
      console.log(`${p.version}    | ${p.user_type.padEnd(9)} | ${p.language} | ${p.title.substring(0, 20)}... | ${link}`);
    });
    
    console.log('\n✅ เสร็จสิ้น!');
    console.log('\n📌 ต้องทำ:');
    console.log('1. รีสตาร์ท Backend');
    console.log('2. รีเฟรชหน้า Policy Management');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

finalFixUserType();
