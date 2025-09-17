const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'consent',
  user: 'postgres',
  password: '4321'
});

async function resetAllPolicies() {
  try {
    console.log('🔧 RESET ระบบ Policies ทั้งหมด...\n');
    
    // 1. Drop และสร้างตารางใหม่
    await pool.query('DROP TABLE IF EXISTS policy_versions CASCADE');
    await pool.query(`
      CREATE TABLE policy_versions (
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
    console.log('✅ สร้างตารางใหม่');
    
    // 2. สร้าง Policies
    const policies = [
      // Customer - Thai
      {
        version: '1.0.0',
        title: 'นโยบายลูกค้า (ภาษาไทย)',
        content: '<h2>นโยบายความเป็นส่วนตัว</h2><p>เนื้อหาภาษาไทยสำหรับลูกค้า</p>',
        language: 'th-TH',
        user_type: 'customer'
      },
      // Customer - English
      {
        version: '1.0.0',
        title: 'Customer Policy (English)',
        content: '<h2>Privacy Policy</h2><p>English content for customers</p>',
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
    
    console.log('📝 สร้าง Policies:');
    for (const policy of policies) {
      const result = await pool.query(
        `INSERT INTO policy_versions 
         (version, title, content, language, user_type, is_active, effective_date) 
         VALUES ($1, $2, $3, $4, $5, true, NOW())
         RETURNING *`,
        [policy.version, policy.title, policy.content, policy.language, policy.user_type]
      );
      const p = result.rows[0];
      console.log(`✅ [${p.id}] ${p.user_type} - ${p.language}: "${p.title}"`);
    }
    
    // 3. ตรวจสอบผลลัพธ์
    console.log('\n📊 Policies ทั้งหมด:');
    const check = await pool.query('SELECT * FROM policy_versions ORDER BY id');
    
    console.table(check.rows.map(p => ({
      ID: p.id,
      UserType: p.user_type,
      Language: p.language,
      Title: p.title,
      Active: p.is_active
    })));
    
    console.log('\n✅ RESET เสร็จสมบูรณ์!');
    console.log('\n⚠️ กรุณา:');
    console.log('1. รีสตาร์ท Backend (Ctrl+C แล้ว node server.js)');
    console.log('2. รีเฟรชหน้า Policy Management');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

resetAllPolicies();
