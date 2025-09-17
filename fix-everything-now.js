const { Pool } = require('pg');
const axios = require('axios');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'consent',
  user: 'postgres',
  password: '4321'
});

async function fixEverythingNow() {
  try {
    console.log('🔧 แก้ไขทุกอย่างให้ถูกต้อง...\n');
    
    // 1. ลบข้อมูลเก่าทั้งหมด
    await pool.query('DELETE FROM policy_versions');
    console.log('✅ ลบข้อมูลเก่า');
    
    // 2. สร้าง Policies ใหม่ที่ถูกต้อง
    const policies = [
      // Customer Thai
      {
        version: '1.0.0',
        title: 'นโยบายลูกค้า (ภาษาไทย)',
        content: '<h2>นโยบายลูกค้า</h2><p>เนื้อหาภาษาไทยสำหรับลูกค้า</p>',
        language: 'th-TH',
        user_type: 'customer'
      },
      // Customer English
      {
        version: '1.0.0',
        title: 'Customer Policy (English)',
        content: '<h2>Customer Policy</h2><p>English content for customers</p>',
        language: 'en-US',
        user_type: 'customer'
      },
      // Employee
      {
        version: '1.0.0',
        title: 'นโยบายพนักงาน',
        content: '<h2>นโยบายพนักงาน</h2><p>เนื้อหาสำหรับพนักงาน</p>',
        language: 'th-TH',
        user_type: 'employee'
      },
      // Partner
      {
        version: '1.0.0',
        title: 'นโยบายพันธมิตร',
        content: '<h2>นโยบายพันธมิตร</h2><p>เนื้อหาสำหรับพันธมิตร</p>',
        language: 'th-TH',
        user_type: 'partner'
      },
      // Vendor
      {
        version: '1.0.0',
        title: 'นโยบายผู้ขาย',
        content: '<h2>นโยบายผู้ขาย</h2><p>เนื้อหาสำหรับผู้ขาย</p>',
        language: 'th-TH',
        user_type: 'vendor'
      }
    ];
    
    console.log('\n📝 สร้าง Policies:');
    for (const policy of policies) {
      const result = await pool.query(
        `INSERT INTO policy_versions 
         (version, title, content, language, user_type, is_active, effective_date) 
         VALUES ($1, $2, $3, $4, $5, true, NOW())
         RETURNING id, user_type, language`,
        [policy.version, policy.title, policy.content, policy.language, policy.user_type]
      );
      const row = result.rows[0];
      console.log(`✅ [${row.id}] ${row.user_type} - ${row.language}`);
    }
    
    // 3. ตรวจสอบผลลัพธ์
    console.log('\n📊 ตรวจสอบผลลัพธ์:');
    const check = await pool.query(`
      SELECT id, user_type, language, title 
      FROM policy_versions 
      ORDER BY user_type, language
    `);
    
    console.log('\nPolicies ในฐานข้อมูล:');
    check.rows.forEach(p => {
      let link = '';
      if (p.user_type === 'customer') {
        link = '/consent/select-language';
      } else {
        link = `/consent/${p.user_type}?lang=${p.language === 'th-TH' ? 'th' : 'en'}`;
      }
      console.log(`[${p.id}] ${p.user_type} | ${p.language} | ${link}`);
    });
    
    // 4. ทดสอบ API
    console.log('\n🌐 ทดสอบ API /api/simple-policy:');
    try {
      const apiRes = await axios.get('http://localhost:3000/api/simple-policy');
      if (apiRes.data.success && apiRes.data.data) {
        console.log(`✅ API ส่งกลับ ${apiRes.data.data.length} policies`);
        apiRes.data.data.forEach(p => {
          console.log(`   - ${p.user_type} | ${p.language} | ${p.title}`);
        });
      }
    } catch (e) {
      console.log('❌ API Error:', e.message);
    }
    
    console.log('\n✅ เสร็จสิ้น!');
    console.log('\n📌 ลิงก์ที่ถูกต้อง:');
    console.log('==================');
    console.log('Customer (ทุกภาษา): http://localhost:3003/consent/select-language');
    console.log('Employee: http://localhost:3003/consent/employee?lang=th');
    console.log('Partner: http://localhost:3003/consent/partner?lang=th');
    console.log('Vendor: http://localhost:3003/consent/vendor?lang=th');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

fixEverythingNow();
