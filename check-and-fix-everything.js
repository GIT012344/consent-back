const { Pool } = require('pg');
const axios = require('axios');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'consent',
  user: 'postgres',
  password: '4321'
});

async function checkAndFixEverything() {
  try {
    console.log('🔍 ตรวจสอบและแก้ไขระบบทั้งหมด...\n');
    
    // 1. ตรวจสอบ policies ที่มีอยู่
    console.log('📋 STEP 1: ตรวจสอบ Policies ในฐานข้อมูล');
    console.log('=========================================');
    
    const existing = await pool.query(`
      SELECT id, user_type, language, title, version,
             LEFT(content, 100) as content_preview
      FROM policy_versions
      ORDER BY user_type, language
    `);
    
    console.log('Policies ที่มีอยู่:');
    existing.rows.forEach(p => {
      console.log(`[${p.id}] ${p.user_type} | ${p.language} | ${p.title}`);
    });
    
    // 2. ลบข้อมูลเก่าและสร้างใหม่
    console.log('\n📋 STEP 2: ลบข้อมูลเก่าและสร้างใหม่');
    console.log('====================================');
    
    await pool.query('DELETE FROM policy_versions');
    console.log('✅ ลบข้อมูลเก่าแล้ว');
    
    // 3. สร้าง policies ใหม่ที่ถูกต้อง
    const policies = [
      // Customer Thai - ลูกค้าเลือกไทย
      {
        version: '1.0.0',
        title: 'นโยบายความเป็นส่วนตัว (ภาษาไทย)',
        content: `<h2>นโยบายความเป็นส่วนตัว</h2>
<p>ยินดีต้อนรับสู่บริการของเรา</p>
<p><br></p>
<p>ข้อมูลที่เราเก็บ:</p>
<ul>
<li>ชื่อ-นามสกุล</li>
<li>เลขบัตรประชาชน</li>
<li>ที่อยู่</li>
</ul>`,
        language: 'th-TH',
        user_type: 'customer'
      },
      
      // Customer English - ลูกค้าเลือกอังกฤษ
      {
        version: '1.0.0',
        title: 'Privacy Policy (English)',
        content: `<h2>Privacy Policy</h2>
<p>Welcome to our service</p>
<p><br></p>
<p>Information we collect:</p>
<ul>
<li>Full Name</li>
<li>ID/Passport</li>
<li>Address</li>
</ul>`,
        language: 'en-US',
        user_type: 'customer'
      },
      
      // Employee - พนักงาน (ลิงก์ตรง)
      {
        version: '1.0.0',
        title: 'นโยบายพนักงาน',
        content: `<h2>นโยบายพนักงาน</h2>
<p>สำหรับพนักงานบริษัท</p>
<ul>
<li>รหัสพนักงาน</li>
<li>ตำแหน่ง</li>
</ul>`,
        language: 'th-TH',
        user_type: 'employee'
      },
      
      // Partner - พันธมิตร (ลิงก์ตรง)
      {
        version: '1.0.0',
        title: 'นโยบายพันธมิตร',
        content: `<h2>นโยบายพันธมิตร</h2>
<p>สำหรับพันธมิตรธุรกิจ</p>
<ul>
<li>ชื่อบริษัท</li>
<li>เลขทะเบียน</li>
</ul>`,
        language: 'th-TH',
        user_type: 'partner'
      }
    ];
    
    for (const policy of policies) {
      const result = await pool.query(
        `INSERT INTO policy_versions 
         (version, title, content, language, user_type, is_active, effective_date) 
         VALUES ($1, $2, $3, $4, $5, true, NOW())
         RETURNING id`,
        [policy.version, policy.title, policy.content, policy.language, policy.user_type]
      );
      console.log(`✅ สร้าง: ${policy.user_type} - ${policy.language} (ID: ${result.rows[0].id})`);
    }
    
    // 4. ทดสอบ API
    console.log('\n📋 STEP 3: ทดสอบ API Endpoints');
    console.log('================================');
    
    // ทดสอบ customer Thai
    try {
      const res = await axios.get('http://localhost:3000/api/simple-policy/active?userType=customer&language=th-TH');
      if (res.data.success && res.data.data) {
        console.log(`✅ Customer Thai: "${res.data.data.title}"`);
      } else {
        console.log('❌ Customer Thai: ไม่พบข้อมูล');
      }
    } catch (e) {
      console.log('❌ Customer Thai API Error:', e.message);
    }
    
    // ทดสอบ customer English
    try {
      const res = await axios.get('http://localhost:3000/api/simple-policy/active?userType=customer&language=en-US');
      if (res.data.success && res.data.data) {
        console.log(`✅ Customer English: "${res.data.data.title}"`);
      } else {
        console.log('❌ Customer English: ไม่พบข้อมูล');
      }
    } catch (e) {
      console.log('❌ Customer English API Error:', e.message);
    }
    
    // ทดสอบ employee
    try {
      const res = await axios.get('http://localhost:3000/api/simple-policy/active?userType=employee&language=th-TH');
      if (res.data.success && res.data.data) {
        console.log(`✅ Employee Thai: "${res.data.data.title}"`);
      } else {
        console.log('❌ Employee Thai: ไม่พบข้อมูล');
      }
    } catch (e) {
      console.log('❌ Employee Thai API Error:', e.message);
    }
    
    // 5. ตรวจสอบผลลัพธ์สุดท้าย
    console.log('\n📋 STEP 4: ตรวจสอบผลลัพธ์สุดท้าย');
    console.log('===================================');
    
    const finalCheck = await pool.query(`
      SELECT user_type, language, title 
      FROM policy_versions 
      WHERE is_active = true
      ORDER BY user_type, language
    `);
    
    console.log('\nPolicies ที่พร้อมใช้งาน:');
    finalCheck.rows.forEach(p => {
      console.log(`✓ ${p.user_type} | ${p.language} | ${p.title}`);
    });
    
    console.log('\n✅ ระบบพร้อมใช้งาน!');
    console.log('\n📌 วิธีทดสอบ:');
    console.log('==============');
    console.log('1. Customer (เลือกภาษา):');
    console.log('   - เข้า: http://localhost:3003/consent/select-language');
    console.log('   - เลือกไทย → แสดง "นโยบายความเป็นส่วนตัว (ภาษาไทย)"');
    console.log('   - เลือกอังกฤษ → แสดง "Privacy Policy (English)"');
    console.log('');
    console.log('2. UserType อื่นๆ (ลิงก์ตรง):');
    console.log('   - Employee: http://localhost:3003/consent/employee?lang=th');
    console.log('   - Partner: http://localhost:3003/consent/partner?lang=th');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

checkAndFixEverything();
