const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'consent',
  user: 'postgres',
  password: '4321'
});

async function checkAndFixDb() {
  try {
    console.log('🔍 ตรวจสอบและแก้ไขฐานข้อมูล...\n');
    
    // 1. ตรวจสอบข้อมูลปัจจุบัน
    console.log('📋 ข้อมูลปัจจุบันในฐานข้อมูล:');
    const current = await pool.query(`
      SELECT id, user_type, language, title, version
      FROM policy_versions
      ORDER BY id DESC
    `);
    
    console.log('พบ', current.rows.length, 'policies:');
    current.rows.forEach(p => {
      console.log(`[${p.id}] userType: "${p.user_type}" | ${p.language} | ${p.title}`);
    });
    
    // 2. ตรวจสอบว่ามี policy ที่ userType ผิดหรือไม่
    const wrongCustomer = current.rows.filter(p => 
      p.user_type === 'customer' && 
      (p.title.includes('พนักงาน') || p.title.includes('พันธมิตร') || p.title.includes('ผู้ขาย'))
    );
    
    if (wrongCustomer.length > 0) {
      console.log('\n❌ พบ policies ที่ userType ผิด:');
      wrongCustomer.forEach(p => {
        console.log(`   [${p.id}] ${p.title} -> userType เป็น customer (ผิด)`);
      });
      
      // 3. แก้ไข userType ที่ผิด
      console.log('\n🔧 แก้ไข userType...');
      
      for (const p of wrongCustomer) {
        let correctUserType = 'customer';
        
        if (p.title.includes('พนักงาน')) {
          correctUserType = 'employee';
        } else if (p.title.includes('พันธมิตร')) {
          correctUserType = 'partner';
        } else if (p.title.includes('ผู้ขาย')) {
          correctUserType = 'vendor';
        } else if (p.title.includes('ผู้รับเหมา')) {
          correctUserType = 'contractor';
        }
        
        if (correctUserType !== 'customer') {
          await pool.query(
            'UPDATE policy_versions SET user_type = $1 WHERE id = $2',
            [correctUserType, p.id]
          );
          console.log(`   ✅ แก้ไข [${p.id}] เป็น ${correctUserType}`);
        }
      }
    }
    
    // 4. ตรวจสอบผลลัพธ์หลังแก้ไข
    console.log('\n📊 ผลลัพธ์หลังแก้ไข:');
    const fixed = await pool.query(`
      SELECT id, user_type, language, title
      FROM policy_versions
      ORDER BY user_type, language
    `);
    
    console.log('\nPolicies ทั้งหมด:');
    fixed.rows.forEach(p => {
      let link = p.user_type === 'customer' 
        ? '/consent/select-language'
        : `/consent/${p.user_type}?lang=${p.language === 'th-TH' ? 'th' : 'en'}`;
      console.log(`[${p.id}] ${p.user_type.padEnd(10)} | ${p.language} | ${link}`);
    });
    
    // 5. สรุป userTypes ที่มี
    const userTypes = [...new Set(fixed.rows.map(p => p.user_type))];
    console.log('\n✅ UserTypes ที่มี:', userTypes.join(', '));
    
    console.log('\n✅ แก้ไขเสร็จสิ้น! รีเฟรชหน้า Policy Management');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkAndFixDb();
