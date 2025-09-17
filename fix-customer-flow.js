const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'consent',
  user: 'postgres',
  password: '4321'
});

async function fixCustomerFlow() {
  try {
    console.log('🔧 แก้ไข Customer Flow ให้ถูกต้อง...\n');
    
    // 1. ลบข้อมูลเก่าทั้งหมด
    await pool.query('DELETE FROM policy_versions');
    console.log('✅ ลบข้อมูลเก่า');
    
    // 2. สร้าง Policies ใหม่ที่ถูกต้อง
    console.log('\n📝 สร้าง Policies ใหม่:');
    
    // Customer Thai - เนื้อหาภาษาไทย
    const customerThaiResult = await pool.query(
      `INSERT INTO policy_versions 
       (version, title, content, language, user_type, is_active, effective_date) 
       VALUES ($1, $2, $3, $4, $5, true, NOW())
       RETURNING id`,
      [
        '1.0.0',
        'นโยบายความเป็นส่วนตัว (ภาษาไทย)',
        `<h2>นโยบายความเป็นส่วนตัว</h2>
<p>ยินดีต้อนรับสู่บริการของเรา</p>
<p>&nbsp;</p>
<p>ข้อมูลที่เราเก็บรวบรวม:</p>
<ul>
<li>ชื่อ-นามสกุล</li>
<li>เลขบัตรประชาชน/พาสปอร์ต</li>
<li>ที่อยู่</li>
<li>เบอร์โทรศัพท์</li>
<li>อีเมล</li>
</ul>
<p>&nbsp;</p>
<p>เราจะเก็บรักษาข้อมูลของท่านอย่างปลอดภัย</p>`,
        'th-TH',
        'customer'
      ]
    );
    console.log(`✅ Customer Thai - ID: ${customerThaiResult.rows[0].id}`);
    
    // Customer English - เนื้อหาภาษาอังกฤษ
    const customerEnResult = await pool.query(
      `INSERT INTO policy_versions 
       (version, title, content, language, user_type, is_active, effective_date) 
       VALUES ($1, $2, $3, $4, $5, true, NOW())
       RETURNING id`,
      [
        '1.0.0',
        'Privacy Policy (English)',
        `<h2>Privacy Policy</h2>
<p>Welcome to our service</p>
<p>&nbsp;</p>
<p>Information we collect:</p>
<ul>
<li>Full Name</li>
<li>ID/Passport Number</li>
<li>Address</li>
<li>Phone Number</li>
<li>Email</li>
</ul>
<p>&nbsp;</p>
<p>We will keep your information secure</p>`,
        'en-US',
        'customer'
      ]
    );
    console.log(`✅ Customer English - ID: ${customerEnResult.rows[0].id}`);
    
    // Employee Thai - สำหรับ userType อื่นๆ
    const employeeResult = await pool.query(
      `INSERT INTO policy_versions 
       (version, title, content, language, user_type, is_active, effective_date) 
       VALUES ($1, $2, $3, $4, $5, true, NOW())
       RETURNING id`,
      [
        '1.0.0',
        'นโยบายพนักงาน',
        `<h2>นโยบายพนักงาน</h2>
<p>สำหรับพนักงานบริษัท</p>
<p>&nbsp;</p>
<ul>
<li>รหัสพนักงาน</li>
<li>ตำแหน่ง</li>
<li>แผนก</li>
</ul>`,
        'th-TH',
        'employee'
      ]
    );
    console.log(`✅ Employee - ID: ${employeeResult.rows[0].id}`);
    
    // 3. ตรวจสอบผลลัพธ์
    console.log('\n📊 ตรวจสอบผลลัพธ์:');
    const check = await pool.query(`
      SELECT id, user_type, language, title 
      FROM policy_versions 
      ORDER BY user_type, language
    `);
    
    check.rows.forEach(p => {
      console.log(`[${p.id}] ${p.user_type} | ${p.language} | ${p.title}`);
    });
    
    console.log('\n✅ เสร็จสิ้น!');
    console.log('\n📌 วิธีทดสอบ:');
    console.log('==============');
    console.log('1. Customer:');
    console.log('   - เข้า http://localhost:3003/consent/select-language');
    console.log('   - เลือก "ภาษาไทย" → แสดง "นโยบายความเป็นส่วนตัว (ภาษาไทย)"');
    console.log('   - เลือก "English" → แสดง "Privacy Policy (English)"');
    console.log('');
    console.log('2. Employee:');
    console.log('   - เข้า http://localhost:3003/consent/employee?lang=th');
    console.log('   - แสดง "นโยบายพนักงาน"');
    console.log('');
    console.log('⚠️ หากต้องการเนื้อหาอื่น:');
    console.log('   ให้สร้างผ่านหน้า /admin/create-policy');
    console.log('   โดยระบุ userType และ language ให้ถูกต้อง');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

fixCustomerFlow();
