const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'consent',
  user: 'postgres',
  password: '4321'
});

async function createTestPolicies() {
  try {
    console.log('Creating test policies...\n');
    
    // Clear existing policies
    await pool.query('DELETE FROM policy_versions');
    console.log('✅ Cleared existing policies');
    
    // Create policies for different user types and languages
    const policies = [
      // Customer - Thai
      {
        version: '1.0.0',
        title: 'นโยบายความเป็นส่วนตัว - ลูกค้า',
        content: `<h2>นโยบายความเป็นส่วนตัว</h2>
<p>เรายินดีต้อนรับท่านสู่บริการของเรา</p>
<p>ข้อมูลส่วนบุคคลของท่าน:</p>
<ul>
<li>ชื่อ-นามสกุล</li>
<li>เลขบัตรประชาชน</li>
<li>ที่อยู่</li>
<li>เบอร์โทรศัพท์</li>
</ul>
<p>เราจะเก็บรักษาข้อมูลของท่านอย่างปลอดภัย</p>`,
        language: 'th-TH',
        user_type: 'customer'
      },
      // Customer - English
      {
        version: '1.0.0',
        title: 'Privacy Policy - Customer',
        content: `<h2>Privacy Policy</h2>
<p>Welcome to our service</p>
<p>Your personal information:</p>
<ul>
<li>Name</li>
<li>ID/Passport</li>
<li>Address</li>
<li>Phone number</li>
</ul>
<p>We will keep your information secure</p>`,
        language: 'en-US',
        user_type: 'customer'
      },
      // Employee - Thai
      {
        version: '1.0.0',
        title: 'นโยบายพนักงาน',
        content: `<h2>นโยบายความเป็นส่วนตัวสำหรับพนักงาน</h2>
<p>ข้อมูลพนักงาน:</p>
<ul>
<li>รหัสพนักงาน</li>
<li>ตำแหน่ง</li>
<li>แผนก</li>
<li>เงินเดือน</li>
</ul>`,
        language: 'th-TH',
        user_type: 'employee'
      },
      // Employee - English
      {
        version: '1.0.0',
        title: 'Employee Policy',
        content: `<h2>Employee Privacy Policy</h2>
<p>Employee information:</p>
<ul>
<li>Employee ID</li>
<li>Position</li>
<li>Department</li>
<li>Salary</li>
</ul>`,
        language: 'en-US',
        user_type: 'employee'
      },
      // Partner - Thai
      {
        version: '1.0.0',
        title: 'นโยบายพาร์ทเนอร์',
        content: `<h2>นโยบายสำหรับพาร์ทเนอร์</h2>
<p>ข้อมูลพาร์ทเนอร์:</p>
<ul>
<li>ชื่อบริษัท</li>
<li>เลขทะเบียน</li>
<li>ที่อยู่</li>
</ul>`,
        language: 'th-TH',
        user_type: 'partner'
      },
      // Vendor - Thai
      {
        version: '1.0.0',
        title: 'นโยบายผู้ขาย',
        content: `<h2>นโยบายสำหรับผู้ขาย</h2>
<p>ข้อมูลผู้ขาย:</p>
<ul>
<li>รหัสผู้ขาย</li>
<li>สินค้า/บริการ</li>
<li>เงื่อนไขการชำระเงิน</li>
</ul>`,
        language: 'th-TH',
        user_type: 'vendor'
      },
      // Contractor - Thai
      {
        version: '1.0.0',
        title: 'นโยบายผู้รับเหมา',
        content: `<h2>นโยบายสำหรับผู้รับเหมา</h2>
<p>ข้อมูลผู้รับเหมา:</p>
<ul>
<li>รหัสผู้รับเหมา</li>
<li>ประเภทงาน</li>
<li>ระยะเวลาสัญญา</li>
</ul>`,
        language: 'th-TH',
        user_type: 'contractor'
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
      console.log(`✅ Created: ${policy.title} (${policy.user_type} - ${policy.language})`);
    }
    
    // Verify
    const count = await pool.query('SELECT COUNT(*) FROM policy_versions');
    console.log(`\n✅ Total policies created: ${count.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

createTestPolicies();
