const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'consent',
  user: 'postgres',
  password: '4321'
});

async function finalFixContent() {
  try {
    console.log('🔧 แก้ไขปัญหาเนื้อหาครั้งสุดท้าย...\n');
    
    // 1. ลบข้อมูลเก่าทั้งหมด
    await pool.query('DELETE FROM policy_versions');
    console.log('✅ ลบข้อมูลเก่า\n');
    
    // 2. สร้าง Policy ทดสอบที่ชัดเจน
    console.log('📝 สร้าง Policy ทดสอบ:\n');
    
    // Customer Thai
    await pool.query(`
      INSERT INTO policy_versions 
      (version, title, content, language, user_type, is_active, created_at)
      VALUES 
      ('CUST-TH-001', 
       'นโยบายลูกค้า ภาษาไทย - สร้างเมื่อ ${new Date().toLocaleString('th-TH')}',
       '<h1>นี่คือเนื้อหาที่คุณจะเห็นสำหรับลูกค้า ภาษาไทย</h1><p>สร้างเมื่อ: ${new Date().toLocaleString('th-TH')}</p><p>UserType: customer</p><p>Language: th-TH</p>',
       'th-TH',
       'customer',
       true,
       NOW())
    `);
    console.log('✅ Customer Thai');
    
    // Customer English
    await pool.query(`
      INSERT INTO policy_versions 
      (version, title, content, language, user_type, is_active, created_at)
      VALUES 
      ('CUST-EN-001',
       'Customer Policy English - Created at ${new Date().toLocaleString('en-US')}',
       '<h1>This is the content you will see for Customer English</h1><p>Created: ${new Date().toLocaleString('en-US')}</p><p>UserType: customer</p><p>Language: en-US</p>',
       'en-US',
       'customer',
       true,
       NOW())
    `);
    console.log('✅ Customer English');
    
    // Employee Thai
    await pool.query(`
      INSERT INTO policy_versions 
      (version, title, content, language, user_type, is_active, created_at)
      VALUES 
      ('EMP-TH-001',
       'นโยบายพนักงาน - สร้างเมื่อ ${new Date().toLocaleString('th-TH')}',
       '<h1>นี่คือเนื้อหาที่คุณจะเห็นสำหรับพนักงาน</h1><p>สร้างเมื่อ: ${new Date().toLocaleString('th-TH')}</p><p>UserType: employee</p><p>Language: th-TH</p>',
       'th-TH',
       'employee',
       true,
       NOW())
    `);
    console.log('✅ Employee Thai');
    
    // 3. ตรวจสอบข้อมูล
    console.log('\n📊 ข้อมูลที่สร้าง:\n');
    const check = await pool.query('SELECT * FROM policy_versions ORDER BY version');
    
    check.rows.forEach(p => {
      console.log(`[${p.version}]`);
      console.log(`UserType: ${p.user_type}`);
      console.log(`Language: ${p.language}`);
      console.log(`Title: ${p.title}`);
      console.log(`Content: ${p.content}`);
      console.log('---\n');
    });
    
    console.log('✅ เสร็จสิ้น!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📌 ขั้นตอนต่อไป (สำคัญมาก!):');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('1. รีสตาร์ท Backend:');
    console.log('   cd c:\\Users\\jchayapol\\consent-back');
    console.log('   Ctrl+C (หยุด backend)');
    console.log('   node server.js (เริ่มใหม่)\n');
    
    console.log('2. Clear Browser Cache:');
    console.log('   - กด Ctrl+Shift+Delete');
    console.log('   - เลือก Clear Cache');
    console.log('   - กด Clear\n');
    
    console.log('3. ทดสอบ:');
    console.log('   Customer: http://localhost:3003/consent/select-language');
    console.log('   - เลือก "ภาษาไทย" → ควรเห็น "นโยบายลูกค้า ภาษาไทย"');
    console.log('   - เลือก "English" → ควรเห็น "Customer Policy English"');
    console.log('   Employee: http://localhost:3003/consent/employee?lang=th');
    console.log('   - ควรเห็น "นโยบายพนักงาน"\n');
    
    console.log('4. ถ้าต้องการเนื้อหาอื่น:');
    console.log('   - สร้างที่: http://localhost:3003/admin/create-policy');
    console.log('   - ใส่เนื้อหาที่คุณต้องการ');
    console.log('   - รีสตาร์ท Backend หลังสร้าง');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

finalFixContent();
