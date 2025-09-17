const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'consent',
  user: 'postgres',
  password: '4321'
});

async function clearAndGuide() {
  try {
    console.log('🧹 ลบข้อมูลเก่าทั้งหมด...\n');
    
    // ลบข้อมูลเก่าทั้งหมด
    await pool.query('DELETE FROM policy_versions');
    console.log('✅ ลบข้อมูลเก่าเรียบร้อย');
    
    console.log('\n📝 ตอนนี้ฐานข้อมูลว่างแล้ว');
    console.log('=====================================\n');
    
    console.log('👉 กรุณาสร้าง Policies ใหม่ผ่านหน้า /admin/create-policy:');
    console.log('');
    console.log('1️⃣ Customer ภาษาไทย:');
    console.log('   - User Type: customer');
    console.log('   - Language: ภาษาไทย (th-TH)');
    console.log('   - Title: [ใส่ชื่อที่คุณต้องการ]');
    console.log('   - Content: [ใส่เนื้อหาที่คุณต้องการ]');
    console.log('');
    console.log('2️⃣ Customer English:');
    console.log('   - User Type: customer');
    console.log('   - Language: English (en-US)');
    console.log('   - Title: [Your English title]');
    console.log('   - Content: [Your English content]');
    console.log('');
    console.log('3️⃣ UserType อื่นๆ (ถ้าต้องการ):');
    console.log('   - User Type: employee/partner/vendor');
    console.log('   - Language: เลือกตามต้องการ');
    console.log('   - Title & Content: ตามต้องการ');
    console.log('');
    console.log('📌 หลังสร้างเสร็จ:');
    console.log('==================');
    console.log('• Customer: เข้า http://localhost:3003/consent/select-language');
    console.log('  - เลือกภาษาไทย → แสดงเนื้อหาที่คุณสร้างสำหรับ customer + th-TH');
    console.log('  - เลือก English → แสดงเนื้อหาที่คุณสร้างสำหรับ customer + en-US');
    console.log('');
    console.log('• UserType อื่นๆ: ใช้ลิงก์ตรง');
    console.log('  - Employee: http://localhost:3003/consent/employee?lang=th');
    console.log('  - Partner: http://localhost:3003/consent/partner?lang=th');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

clearAndGuide();
