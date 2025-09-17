const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'consent',
  user: 'postgres',
  password: '4321'
});

async function clearAndGuideCreation() {
  try {
    console.log('🧹 ลบข้อมูลเก่าและแนะนำการสร้างใหม่...\n');
    
    // ลบข้อมูลเก่าทั้งหมด
    await pool.query('DELETE FROM policy_versions');
    console.log('✅ ลบข้อมูลเก่าทั้งหมดแล้ว\n');
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📝 ตอนนี้ฐานข้อมูลว่างแล้ว - พร้อมสำหรับข้อมูลใหม่');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('👉 สร้าง Policy ใหม่ได้ที่:');
    console.log('   http://localhost:3003/admin/create-policy\n');
    
    console.log('📌 ตัวอย่างการสร้าง:\n');
    
    console.log('1️⃣ สำหรับลูกค้า (Customer):');
    console.log('   - User Type: customer');
    console.log('   - Language: ภาษาไทย (th-TH) หรือ English (en-US)');
    console.log('   - Title: [ใส่หัวข้อที่คุณต้องการ]');
    console.log('   - Content: [เขียนเนื้อหาที่คุณต้องการ]');
    console.log('   ✅ ลิงก์: /consent/select-language\n');
    
    console.log('2️⃣ สำหรับพนักงาน (Employee):');
    console.log('   - User Type: employee');
    console.log('   - Language: เลือกภาษา');
    console.log('   - Title: [ใส่หัวข้อที่คุณต้องการ]');
    console.log('   - Content: [เขียนเนื้อหาที่คุณต้องการ]');
    console.log('   ✅ ลิงก์: /consent/employee?lang=th\n');
    
    console.log('3️⃣ สำหรับพันธมิตร (Partner):');
    console.log('   - User Type: partner');
    console.log('   - Language: เลือกภาษา');
    console.log('   - Title: [ใส่หัวข้อที่คุณต้องการ]');
    console.log('   - Content: [เขียนเนื้อหาที่คุณต้องการ]');
    console.log('   ✅ ลิงก์: /consent/partner?lang=th\n');
    
    console.log('4️⃣ UserType อื่นๆ:');
    console.log('   - User Type: vendor, contractor, หรืออื่นๆ');
    console.log('   - Content: [เขียนเนื้อหาที่คุณต้องการ]\n');
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('⚠️ สำคัญ: เนื้อหาที่คุณเขียนในหน้าสร้าง');
    console.log('         จะเป็นเนื้อหาที่แสดงในลิงก์นั้นๆ');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('✅ พร้อมแล้ว! ไปสร้าง Policy ที่:');
    console.log('   http://localhost:3003/admin/create-policy');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

clearAndGuideCreation();
