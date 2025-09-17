const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'consent',
  user: 'postgres',
  password: '4321'
});

async function createProperPolicies() {
  try {
    console.log('🔧 สร้าง Policies ที่ถูกต้อง...\n');
    
    // 1. ลบข้อมูลเก่า
    await pool.query('DELETE FROM policy_versions');
    console.log('✅ ลบข้อมูลเก่า');
    
    // 2. สร้าง Policies ตามที่ USER ต้องการ
    const policies = [];
    
    // ตัวอย่าง: Customer Thai - เนื้อหาที่ USER สร้าง
    console.log('\n📝 กรุณาสร้าง Policies ผ่านหน้า /admin/create-policy:');
    console.log('====================================================');
    console.log('1. Customer (ภาษาไทย):');
    console.log('   - UserType: customer');
    console.log('   - Language: th-TH');
    console.log('   - Title: [ชื่อที่คุณต้องการ]');
    console.log('   - Content: [เนื้อหาที่คุณเขียน]');
    console.log('');
    console.log('2. Customer (English):');
    console.log('   - UserType: customer');
    console.log('   - Language: en-US');
    console.log('   - Title: [ชื่อภาษาอังกฤษ]');
    console.log('   - Content: [เนื้อหาภาษาอังกฤษ]');
    console.log('');
    console.log('3. UserType อื่นๆ (employee, partner, vendor):');
    console.log('   - สร้างตามต้องการ');
    console.log('');
    console.log('📌 วิธีทดสอบ:');
    console.log('==============');
    console.log('1. Customer:');
    console.log('   - เข้า http://localhost:3003/consent/select-language');
    console.log('   - เลือก "ภาษาไทย" → แสดงเนื้อหาที่สร้างไว้สำหรับ customer + th-TH');
    console.log('   - เลือก "English" → แสดงเนื้อหาที่สร้างไว้สำหรับ customer + en-US');
    console.log('');
    console.log('2. UserType อื่นๆ:');
    console.log('   - Employee: http://localhost:3003/consent/employee?lang=th');
    console.log('   - Partner: http://localhost:3003/consent/partner?lang=th');
    console.log('   - Vendor: http://localhost:3003/consent/vendor?lang=th');
    console.log('   - แสดงเนื้อหาตามที่สร้างไว้สำหรับ userType นั้นๆ');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

createProperPolicies();
