const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'consent',
  user: 'postgres',
  password: '4321'
});

async function fixUserTypeFromTitle() {
  try {
    console.log('🔧 แก้ไข UserType ตาม Title...\n');
    
    // 1. ดูข้อมูลปัจจุบัน
    console.log('📋 ข้อมูลก่อนแก้ไข:');
    const before = await pool.query(`
      SELECT id, version, user_type, language, title
      FROM policy_versions
      ORDER BY version
    `);
    
    before.rows.forEach(p => {
      console.log(`[${p.version}] userType:"${p.user_type}" | ${p.title}`);
    });
    
    // 2. แก้ไขตาม title
    console.log('\n🔧 แก้ไข UserType:');
    
    // แก้ไข 003 - นโยบายพนักงาน -> employee
    await pool.query(`
      UPDATE policy_versions 
      SET user_type = 'employee'
      WHERE version = '003' OR title LIKE '%พนักงาน%'
    `);
    console.log('✅ แก้ไข นโยบายพนักงาน -> employee');
    
    // แก้ไข 004 - นโยบายพันธมิตร -> partner  
    await pool.query(`
      UPDATE policy_versions 
      SET user_type = 'partner'
      WHERE version = '004' OR title LIKE '%พันธมิตร%'
    `);
    console.log('✅ แก้ไข นโยบายพันธมิตร -> partner');
    
    // Customer ยังคงเป็น customer (001, 002)
    await pool.query(`
      UPDATE policy_versions 
      SET user_type = 'customer'
      WHERE version IN ('001', '002') OR 
            title LIKE '%ลูกค้า%' OR 
            title LIKE '%Customer%'
    `);
    console.log('✅ คง Customer policies');
    
    // 3. ตรวจสอบผลลัพธ์
    console.log('\n📊 ผลลัพธ์หลังแก้ไข:');
    const after = await pool.query(`
      SELECT version, user_type, language, title
      FROM policy_versions
      ORDER BY version
    `);
    
    console.log('\nVersion | UserType | Title | Link');
    console.log('--------|----------|-------|-----');
    after.rows.forEach(p => {
      let link = '';
      if (p.user_type === 'customer') {
        link = '/consent/select-language';
      } else {
        const lang = p.language === 'th-TH' ? 'th' : 'en';
        link = `/consent/${p.user_type}?lang=${lang}`;
      }
      console.log(`${p.version}    | ${p.user_type.padEnd(8)} | ${p.title.substring(0, 20)}... | ${link}`);
    });
    
    console.log('\n✅ แก้ไขเสร็จสิ้น!');
    console.log('\n⚠️ ต้องทำทันที:');
    console.log('1. รีสตาร์ท Backend (Ctrl+C แล้ว node server.js)');
    console.log('2. Hard Refresh (Ctrl+Shift+R) หน้า Policy Management');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

fixUserTypeFromTitle();
