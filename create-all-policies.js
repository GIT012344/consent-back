const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'consent',
  user: 'postgres',
  password: '4321'
});

async function createAllPolicies() {
  try {
    console.log('🔧 สร้าง Policies ทั้งหมดใหม่...\n');
    
    // 1. สร้างตารางถ้ายังไม่มี
    await pool.query(`
      CREATE TABLE IF NOT EXISTS policy_versions (
        id SERIAL PRIMARY KEY,
        version VARCHAR(50),
        title VARCHAR(255),
        content TEXT,
        language VARCHAR(10),
        user_type VARCHAR(50),
        effective_date TIMESTAMP,
        expiry_date TIMESTAMP,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // 2. ลบข้อมูลเก่า
    await pool.query('DELETE FROM policy_versions');
    console.log('✅ ลบข้อมูลเก่า');
    
    // 3. สร้าง Policies ใหม่
    const policies = [
      // Customer - Thai
      {
        version: '1.0.0',
        title: 'นโยบายลูกค้า (ภาษาไทย)',
        content: '<h2>นโยบายความเป็นส่วนตัว</h2><p>เนื้อหาภาษาไทยสำหรับลูกค้า</p><p>&nbsp;</p><ul><li>ข้อมูลส่วนตัว</li><li>การใช้งาน</li></ul>',
        language: 'th-TH',
        user_type: 'customer'
      },
      // Customer - English
      {
        version: '1.0.0',
        title: 'Customer Policy (English)',
        content: '<h2>Privacy Policy</h2><p>English content for customers</p><p>&nbsp;</p><ul><li>Personal Data</li><li>Usage</li></ul>',
        language: 'en-US',
        user_type: 'customer'
      },
      // Employee
      {
        version: '1.0.0',
        title: 'นโยบายพนักงาน',
        content: '<h2>นโยบายพนักงาน</h2><p>เนื้อหาสำหรับพนักงาน</p><p>&nbsp;</p><ul><li>รหัสพนักงาน</li><li>ตำแหน่ง</li></ul>',
        language: 'th-TH',
        user_type: 'employee'
      },
      // Partner
      {
        version: '1.0.0',
        title: 'นโยบายพันธมิตร',
        content: '<h2>นโยบายพันธมิตร</h2><p>เนื้อหาสำหรับพันธมิตร</p><p>&nbsp;</p><ul><li>ชื่อบริษัท</li><li>เลขทะเบียน</li></ul>',
        language: 'th-TH',
        user_type: 'partner'
      },
      // Vendor
      {
        version: '1.0.0',
        title: 'นโยบายผู้ขาย',
        content: '<h2>นโยบายผู้ขาย</h2><p>เนื้อหาสำหรับผู้ขาย</p><p>&nbsp;</p><ul><li>รหัสผู้ขาย</li><li>ประเภทสินค้า</li></ul>',
        language: 'th-TH',
        user_type: 'vendor'
      }
    ];
    
    console.log('📝 สร้าง Policies:');
    for (const policy of policies) {
      const result = await pool.query(
        `INSERT INTO policy_versions 
         (version, title, content, language, user_type, is_active, effective_date) 
         VALUES ($1, $2, $3, $4, $5, true, NOW())
         RETURNING id`,
        [policy.version, policy.title, policy.content, policy.language, policy.user_type]
      );
      console.log(`✅ [${result.rows[0].id}] ${policy.user_type} - ${policy.language}: "${policy.title}"`);
    }
    
    // 4. ตรวจสอบผลลัพธ์
    console.log('\n📊 ตรวจสอบผลลัพธ์:');
    const check = await pool.query(`
      SELECT id, user_type, language, title 
      FROM policy_versions 
      ORDER BY id
    `);
    
    console.log('\nPolicies ในฐานข้อมูล:');
    console.log('ID | UserType  | Language | Title');
    console.log('---|-----------|----------|------');
    check.rows.forEach(p => {
      console.log(`${p.id}  | ${p.user_type.padEnd(9)} | ${p.language.padEnd(8)} | ${p.title}`);
    });
    
    console.log('\n✅ เสร็จสิ้น! รีสตาร์ท backend และรีเฟรช Policy Management');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

createAllPolicies();
