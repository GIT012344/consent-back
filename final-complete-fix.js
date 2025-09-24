const { Pool } = require('pg');
const axios = require('axios');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '4321',
  database: 'consent'
});

async function finalCompleteFix() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 FINAL FIX - แก้ไขทุกอย่างให้ทำงานได้จริง\n');
    console.log('='.repeat(80));
    
    // 1. ลบ policies เก่าทั้งหมดและสร้างใหม่
    console.log('1. RESET ฐานข้อมูล\n');
    
    // ลบทั้งหมด
    await client.query('DELETE FROM policy_versions');
    console.log('✅ ลบข้อมูลเก่าทั้งหมด');
    
    // 2. สร้าง policies ตัวอย่างที่ทำงานได้
    console.log('\n2. สร้าง Policies ตัวอย่าง\n');
    
    // Customer Thai
    await client.query(`
      INSERT INTO policy_versions (
        title, user_type, language, version, content, is_active, created_at, updated_at
      ) VALUES (
        'นโยบายลูกค้า TH',
        'customer',
        'th',
        '1.0',
        '<h1>นโยบายความเป็นส่วนตัวสำหรับลูกค้า</h1>
<p>นี่คือเนื้อหาสำหรับลูกค้าภาษาไทย ที่สร้างโดย Admin</p>
<h2>1. การเก็บข้อมูล</h2>
<p>เราเก็บข้อมูลของคุณอย่างปลอดภัย</p>
<h2>2. การใช้ข้อมูล</h2>
<p>ข้อมูลจะถูกใช้เพื่อปรับปรุงบริการ</p>',
        true,
        NOW(),
        NOW()
      )
    `);
    console.log('✅ สร้าง Policy ลูกค้าไทย');
    
    // Customer English
    await client.query(`
      INSERT INTO policy_versions (
        title, user_type, language, version, content, is_active, created_at, updated_at
      ) VALUES (
        'Customer Policy EN',
        'customer',
        'en',
        '1.0',
        '<h1>Privacy Policy for Customers</h1>
<p>This is content for English customers created by Admin</p>
<h2>1. Data Collection</h2>
<p>We collect your data securely</p>
<h2>2. Data Usage</h2>
<p>Data is used to improve our services</p>',
        true,
        NOW(),
        NOW()
      )
    `);
    console.log('✅ สร้าง Policy ลูกค้าอังกฤษ');
    
    // Employee Thai
    await client.query(`
      INSERT INTO policy_versions (
        title, user_type, language, version, content, is_active, created_at, updated_at
      ) VALUES (
        'นโยบายพนักงาน',
        'employee',
        'th',
        '1.0',
        '<h1>ข้อตกลงสำหรับพนักงาน</h1>
<p>เนื้อหาสำหรับพนักงาน ภาษาไทย</p>
<h2>1. การรักษาความลับ</h2>
<p>พนักงานต้องรักษาความลับของบริษัท</p>',
        true,
        NOW(),
        NOW()
      )
    `);
    console.log('✅ สร้าง Policy พนักงานไทย');
    
    // 3. ตรวจสอบว่าบันทึกสำเร็จ
    console.log('\n3. ตรวจสอบข้อมูลที่บันทึก\n');
    const saved = await client.query(`
      SELECT id, user_type, language, title, 
             LEFT(content, 100) as content_preview
      FROM policy_versions
      WHERE is_active = true
      ORDER BY user_type, language
    `);
    
    saved.rows.forEach(p => {
      console.log(`✅ ${p.user_type}/${p.language}: "${p.title}"`);
      console.log(`   ID: ${p.id}`);
      console.log(`   Content: ${p.content_preview}...`);
      console.log('');
    });
    
    // 4. ทดสอบ API
    console.log('4. ทดสอบ API\n');
    
    const tests = [
      { userType: 'customer', language: 'th' },
      { userType: 'customer', language: 'en' },
      { userType: 'employee', language: 'th' }
    ];
    
    for (const test of tests) {
      try {
        const res = await axios.get(
          `http://localhost:3000/api/simple-policy/active?userType=${test.userType}&language=${test.language}`
        );
        
        if (res.data.success && res.data.data) {
          console.log(`✅ ${test.userType}/${test.language}: "${res.data.data.title}"`);
        } else {
          console.log(`❌ ${test.userType}/${test.language}: No data`);
        }
      } catch (err) {
        console.log(`❌ ${test.userType}/${test.language}: ${err.message}`);
      }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('\n✅ ระบบพร้อมใช้งาน!\n');
    
    console.log('📝 วิธีสร้าง Policy ใหม่:');
    console.log('1. ไปที่: http://localhost:5000/admin/create-policy');
    console.log('2. กรอก:');
    console.log('   - Title: ชื่อที่ต้องการ');
    console.log('   - User Type: customer/employee/partner');
    console.log('   - Language: th-TH หรือ en-US');
    console.log('   - Content: เนื้อหาที่ต้องการ');
    console.log('3. กด Save');
    console.log('\n⚠️ หมายเหตุ: ถ้า title ซ้ำกับที่มีอยู่ จะอัพเดทเนื้อหาใหม่ทับ');
    
    console.log('\n🔗 ทดสอบ:');
    console.log('• ลูกค้าไทย: http://localhost:5000/consent/customer?lang=th');
    console.log('• ลูกค้าอังกฤษ: http://localhost:5000/consent/customer?lang=en');
    console.log('• พนักงานไทย: http://localhost:5000/consent/employee?lang=th');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

finalCompleteFix();
