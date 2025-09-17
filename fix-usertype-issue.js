const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'consent',
  user: 'postgres',
  password: '4321'
});

async function fixUserTypeIssue() {
  try {
    console.log('🔧 แก้ไขปัญหา UserType...\n');
    
    // 1. ลบข้อมูลเก่าทั้งหมด
    await pool.query('DELETE FROM policy_versions');
    console.log('✅ ลบข้อมูลเก่า');
    
    // 2. สร้าง Policies ใหม่ที่ถูกต้อง 100%
    const policies = [
      // Customer Thai
      {
        version: '1.0.0',
        title: 'นโยบายลูกค้า (ภาษาไทย)',
        content: '<h2>นโยบายลูกค้า</h2><p>เนื้อหาสำหรับลูกค้าภาษาไทย</p>',
        language: 'th-TH',
        user_type: 'customer'  // ต้องเป็น customer
      },
      // Customer English
      {
        version: '1.0.0',
        title: 'Customer Policy (English)',
        content: '<h2>Customer Policy</h2><p>Content for customers in English</p>',
        language: 'en-US',
        user_type: 'customer'  // ต้องเป็น customer
      },
      // Employee
      {
        version: '1.0.0',
        title: 'นโยบายพนักงาน',
        content: '<h2>นโยบายพนักงาน</h2><p>เนื้อหาสำหรับพนักงาน</p>',
        language: 'th-TH',
        user_type: 'employee'  // ต้องเป็น employee ไม่ใช่ customer!
      },
      // Partner
      {
        version: '1.0.0',
        title: 'นโยบายพันธมิตร',
        content: '<h2>นโยบายพันธมิตร</h2><p>เนื้อหาสำหรับพันธมิตร</p>',
        language: 'th-TH',
        user_type: 'partner'  // ต้องเป็น partner ไม่ใช่ customer!
      },
      // Vendor
      {
        version: '1.0.0',
        title: 'นโยบายผู้ขาย',
        content: '<h2>นโยบายผู้ขาย</h2><p>เนื้อหาสำหรับผู้ขาย</p>',
        language: 'th-TH',
        user_type: 'vendor'  // ต้องเป็น vendor ไม่ใช่ customer!
      }
    ];
    
    console.log('\n📝 สร้าง Policies ที่ถูกต้อง:');
    for (const policy of policies) {
      const result = await pool.query(
        `INSERT INTO policy_versions 
         (version, title, content, language, user_type, is_active, effective_date) 
         VALUES ($1, $2, $3, $4, $5, true, NOW())
         RETURNING id, user_type`,
        [policy.version, policy.title, policy.content, policy.language, policy.user_type]
      );
      
      const inserted = result.rows[0];
      console.log(`✅ [${inserted.id}] UserType: ${inserted.user_type} | ${policy.title}`);
      
      // ตรวจสอบว่า userType ถูกบันทึกถูกต้อง
      if (inserted.user_type !== policy.user_type) {
        console.log(`   ❌ ERROR: UserType ผิด! ควรเป็น ${policy.user_type} แต่บันทึกเป็น ${inserted.user_type}`);
      }
    }
    
    // 3. ตรวจสอบผลลัพธ์สุดท้าย
    console.log('\n📊 ตรวจสอบผลลัพธ์:');
    const check = await pool.query(`
      SELECT id, user_type, language, title 
      FROM policy_versions 
      ORDER BY 
        CASE user_type 
          WHEN 'customer' THEN 1
          WHEN 'employee' THEN 2
          WHEN 'partner' THEN 3
          WHEN 'vendor' THEN 4
          ELSE 5
        END,
        language
    `);
    
    console.log('\nPolicies ในฐานข้อมูล:');
    console.log('ID | UserType  | Language | Title');
    console.log('---|-----------|----------|------');
    
    const userTypeCounts = {};
    check.rows.forEach(p => {
      console.log(`${p.id}  | ${p.user_type.padEnd(9)} | ${p.language} | ${p.title}`);
      userTypeCounts[p.user_type] = (userTypeCounts[p.user_type] || 0) + 1;
    });
    
    console.log('\n📊 สรุป UserTypes:');
    Object.entries(userTypeCounts).forEach(([type, count]) => {
      console.log(`   ${type}: ${count} policies`);
    });
    
    console.log('\n✅ เสร็จสิ้น!');
    console.log('\n⚠️ ถ้ายังแสดงผิด:');
    console.log('1. รีสตาร์ท Backend (Ctrl+C แล้ว node server.js)');
    console.log('2. Clear cache browser (Ctrl+Shift+R)');
    console.log('3. รีเฟรชหน้า Policy Management');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

fixUserTypeIssue();
