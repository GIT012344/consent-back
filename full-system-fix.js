const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'consent',
  user: 'postgres',
  password: '4321'
});

async function fullSystemFix() {
  try {
    console.log('🔧 แก้ไขระบบทั้งหมด...\n');
    
    // 1. ลบข้อมูลเก่าทั้งหมด
    await pool.query('DELETE FROM policy_versions');
    console.log('✅ ลบข้อมูลเก่า');
    
    // 2. สร้าง Policies ตัวอย่าง
    console.log('\n📝 สร้าง Policies ตัวอย่าง:');
    
    const policies = [
      // Customer Thai
      {
        version: '001',
        title: 'นโยบายลูกค้า (ภาษาไทย)',
        content: '<h2>นโยบายความเป็นส่วนตัว</h2><p>เนื้อหาภาษาไทยสำหรับลูกค้า</p>',
        language: 'th-TH',
        user_type: 'customer'
      },
      // Customer English
      {
        version: '002',
        title: 'Customer Policy (English)',
        content: '<h2>Privacy Policy</h2><p>English content for customers</p>',
        language: 'en-US',
        user_type: 'customer'
      },
      // Employee Thai
      {
        version: '003',
        title: 'นโยบายพนักงาน',
        content: '<h2>นโยบายพนักงาน</h2><p>เนื้อหาสำหรับพนักงาน</p>',
        language: 'th-TH',
        user_type: 'employee'
      },
      // Partner Thai
      {
        version: '004',
        title: 'นโยบายพันธมิตร',
        content: '<h2>นโยบายพันธมิตร</h2><p>เนื้อหาสำหรับพันธมิตร</p>',
        language: 'th-TH',
        user_type: 'partner'
      }
    ];
    
    for (const policy of policies) {
      const result = await pool.query(
        `INSERT INTO policy_versions 
         (version, title, content, language, user_type, is_active, effective_date) 
         VALUES ($1, $2, $3, $4, $5, true, NOW())
         RETURNING id, user_type`,
        [policy.version, policy.title, policy.content, policy.language, policy.user_type]
      );
      console.log(`✅ [${policy.version}] ${result.rows[0].user_type} - ${policy.title}`);
    }
    
    // 3. ตรวจสอบผลลัพธ์
    console.log('\n📊 Policies ที่สร้าง:');
    const check = await pool.query(`
      SELECT version, user_type, language, title
      FROM policy_versions
      ORDER BY version
    `);
    
    console.log('\nVersion | UserType | Language | Link');
    console.log('--------|----------|----------|-----');
    check.rows.forEach(p => {
      let link = '';
      if (p.user_type === 'customer') {
        link = 'http://localhost:3003/consent/select-language';
      } else {
        const lang = p.language === 'th-TH' ? 'th' : 'en';
        link = `http://localhost:3003/consent/${p.user_type}?lang=${lang}`;
      }
      console.log(`${p.version}    | ${p.user_type.padEnd(8)} | ${p.language} | ${link}`);
    });
    
    console.log('\n✅ เสร็จสิ้น!');
    console.log('\n📌 วิธีใช้งาน:');
    console.log('================');
    console.log('1. Customer:');
    console.log('   - เข้า http://localhost:3003/consent/select-language');
    console.log('   - เลือกไทย → แสดงเนื้อหา version 001');
    console.log('   - เลือก English → แสดงเนื้อหา version 002');
    console.log('');
    console.log('2. Employee:');
    console.log('   - เข้า http://localhost:3003/consent/employee?lang=th');
    console.log('   - แสดงเนื้อหา version 003');
    console.log('');
    console.log('3. Partner:');
    console.log('   - เข้า http://localhost:3003/consent/partner?lang=th');
    console.log('   - แสดงเนื้อหา version 004');
    console.log('');
    console.log('⚠️ หากต้องการเนื้อหาอื่น:');
    console.log('   สร้างผ่าน /admin/create-policy');
    console.log('   โดยเลือก userType ให้ถูกต้อง');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

fullSystemFix();
