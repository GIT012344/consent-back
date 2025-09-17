const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'consent',
  user: 'postgres',
  password: '4321'
});

async function fixCreatePolicy() {
  try {
    console.log('🔧 แก้ไขปัญหาการสร้าง Policy...\n');
    
    // 1. ดูข้อมูลปัจจุบัน
    console.log('📋 ข้อมูลปัจจุบัน:');
    const current = await pool.query(`
      SELECT id, version, user_type, language, title
      FROM policy_versions
      ORDER BY id DESC
    `);
    
    current.rows.forEach(p => {
      console.log(`[${p.version}] userType:"${p.user_type}" | ${p.language} | ${p.title}`);
    });
    
    // 2. ตรวจสอบว่าทุกอันเป็น customer หรือไม่
    const allCustomer = current.rows.every(p => p.user_type === 'customer');
    if (allCustomer && current.rows.length > 0) {
      console.log('\n❌ ปัญหา: ทุก policy เป็น customer!');
      
      // 3. แก้ไขตาม title หรือ version
      console.log('\n🔧 แก้ไข userType:');
      
      for (const policy of current.rows) {
        let newUserType = policy.user_type;
        
        // ตรวจสอบจาก title
        if (policy.title.includes('พนักงาน') || policy.title.toLowerCase().includes('employee')) {
          newUserType = 'employee';
        } else if (policy.title.includes('พันธมิตร') || policy.title.toLowerCase().includes('partner')) {
          newUserType = 'partner';
        } else if (policy.title.includes('ผู้ขาย') || policy.title.toLowerCase().includes('vendor')) {
          newUserType = 'vendor';
        } else if (policy.version === '003') {
          // Version 003 ควรเป็น employee
          newUserType = 'employee';
        } else if (policy.version === '001' || policy.version === '002') {
          // Version 001, 002 เป็น customer
          newUserType = 'customer';
        }
        
        if (newUserType !== policy.user_type) {
          await pool.query(
            'UPDATE policy_versions SET user_type = $1 WHERE id = $2',
            [newUserType, policy.id]
          );
          console.log(`✅ แก้ไข [${policy.version}] จาก customer -> ${newUserType}`);
        }
      }
    }
    
    // 4. ตรวจสอบผลลัพธ์
    console.log('\n📊 ผลลัพธ์หลังแก้ไข:');
    const fixed = await pool.query(`
      SELECT version, user_type, language, title
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
      console.log(`[${p.version}] ${p.user_type} | Link: ${link}`);
    });
    
    console.log('\n✅ แก้ไขเสร็จ!');
    console.log('\n📌 ขั้นตอนต่อไป:');
    console.log('1. รีสตาร์ท Backend');
    console.log('2. Clear Browser Cache (Ctrl+Shift+R)');
    console.log('3. รีเฟรชหน้า Policy Management');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

fixCreatePolicy();
