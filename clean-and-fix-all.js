const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'consent',
  user: 'postgres',
  password: '4321'
});

async function cleanAndFixAll() {
  try {
    console.log('🧹 ลบข้อมูลที่ผิดและเก็บแต่ที่ถูกต้อง...\n');
    
    // 1. ลบ policies ที่ userType ผิด (ภาษาไทย)
    console.log('🗑️ ลบ policies ที่ผิด:');
    
    // ลบที่ userType เป็นภาษาไทย
    const deleteWrong = await pool.query(`
      DELETE FROM policy_versions 
      WHERE user_type IN ('ดำ', 'ดำไดไำดไำดไดได', 'customer ')
         OR user_type LIKE '%ดำ%'
         OR user_type LIKE '%ไ%'
         OR LENGTH(user_type) > 20
         OR title = ''
         OR title IS NULL
         OR title LIKE '%ดำ%'
      RETURNING id, user_type, title
    `);
    
    if (deleteWrong.rows.length > 0) {
      deleteWrong.rows.forEach(p => {
        console.log(`  ❌ ลบ ID:${p.id} userType:"${p.user_type}" title:"${p.title}"`);
      });
    }
    
    // 2. ตรวจสอบ policies ที่เหลือ
    console.log('\n✅ Policies ที่ถูกต้อง:');
    const remaining = await pool.query(`
      SELECT id, version, user_type, language, title
      FROM policy_versions
      WHERE version IN ('001', '002', '003', '004')
      ORDER BY version
    `);
    
    remaining.rows.forEach(p => {
      console.log(`[${p.version}] ${p.user_type} | ${p.title}`);
    });
    
    // 3. ตรวจสอบว่า userType ถูกต้อง
    console.log('\n🔧 ตรวจสอบและแก้ไข UserType:');
    
    // 001, 002 = customer
    await pool.query(`
      UPDATE policy_versions 
      SET user_type = 'customer'
      WHERE version IN ('001', '002')
    `);
    console.log('✅ 001, 002 -> customer');
    
    // 003 = employee
    await pool.query(`
      UPDATE policy_versions 
      SET user_type = 'employee'
      WHERE version = '003'
    `);
    console.log('✅ 003 -> employee');
    
    // 004 = partner
    await pool.query(`
      UPDATE policy_versions 
      SET user_type = 'partner'
      WHERE version = '004'
    `);
    console.log('✅ 004 -> partner');
    
    // 4. ลบ policies ที่ไม่มี version 001-004
    const deleteExtra = await pool.query(`
      DELETE FROM policy_versions 
      WHERE version NOT IN ('001', '002', '003', '004')
      RETURNING id, version
    `);
    
    if (deleteExtra.rows.length > 0) {
      console.log(`\n🗑️ ลบ policies เกิน: ${deleteExtra.rows.length} รายการ`);
    }
    
    // 5. ผลลัพธ์สุดท้าย
    console.log('\n📊 ผลลัพธ์สุดท้าย:');
    const final = await pool.query(`
      SELECT version, user_type, language, title
      FROM policy_versions
      ORDER BY version
    `);
    
    console.log('\nVersion | UserType | Language | Title | Link');
    console.log('--------|----------|----------|-------|-----');
    final.rows.forEach(p => {
      let link = '';
      if (p.user_type === 'customer') {
        link = 'http://localhost:3003/consent/select-language';
      } else if (p.user_type === 'employee') {
        link = 'http://localhost:3003/consent/employee?lang=th';
      } else if (p.user_type === 'partner') {
        link = 'http://localhost:3003/consent/partner?lang=th';
      }
      console.log(`${p.version}    | ${p.user_type.padEnd(8)} | ${p.language} | ${p.title.substring(0, 20)}... | ${link}`);
    });
    
    console.log('\n✅ เสร็จสิ้น! ระบบสะอาดแล้ว');
    console.log('\n⚠️ รีสตาร์ท Backend และรีเฟรชหน้า Policy Management');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

cleanAndFixAll();
