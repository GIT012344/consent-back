const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'consent',
  user: 'postgres',
  password: '4321'
});

async function fixPolicySystem() {
  try {
    console.log('🔧 Fixing Policy System...\n');
    
    // 1. Create table if not exists
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
    console.log('✅ Table policy_versions ready');
    
    // 2. Clear old data
    await pool.query('DELETE FROM policy_versions');
    console.log('✅ Cleared old policies');
    
    // 3. Insert test policies for all user types
    const policies = [
      // Customer - Thai
      {
        version: '1.0.0',
        title: 'นโยบายความเป็นส่วนตัว',
        content: `<h2>นโยบายความเป็นส่วนตัว</h2>
<p>เรายินดีต้อนรับท่านสู่บริการของเรา</p>

<h3>ข้อมูลที่เราเก็บ</h3>
<ul>
<li>ชื่อ-นามสกุล</li>
<li>เลขบัตรประชาชน</li>
<li>ที่อยู่</li>
<li>เบอร์โทรศัพท์</li>
<li>อีเมล</li>
</ul>

<p>เราจะเก็บรักษาข้อมูลของท่านอย่างปลอดภัยและไม่เปิดเผยต่อบุคคลที่สาม</p>`,
        language: 'th-TH',
        user_type: 'customer'
      },
      // Customer - English  
      {
        version: '1.0.0',
        title: 'Privacy Policy',
        content: `<h2>Privacy Policy</h2>
<p>Welcome to our service</p>

<h3>Information We Collect</h3>
<ul>
<li>Full Name</li>
<li>ID/Passport Number</li>
<li>Address</li>
<li>Phone Number</li>
<li>Email</li>
</ul>

<p>We will keep your information secure and will not share with third parties</p>`,
        language: 'en-US',
        user_type: 'customer'
      },
      // Employee - Thai
      {
        version: '1.0.0',
        title: 'นโยบายข้อมูลพนักงาน',
        content: `<h2>นโยบายข้อมูลพนักงาน</h2>
<p>สำหรับพนักงานของบริษัท</p>

<h3>ข้อมูลที่บริษัทเก็บ</h3>
<ul>
<li>รหัสพนักงาน</li>
<li>ชื่อ-นามสกุล</li>
<li>ตำแหน่งงาน</li>
<li>แผนก</li>
<li>เงินเดือน</li>
<li>ประวัติการทำงาน</li>
</ul>

<p>ข้อมูลเหล่านี้จะใช้เพื่อการบริหารทรัพยากรบุคคลเท่านั้น</p>`,
        language: 'th-TH',
        user_type: 'employee'
      },
      // Employee - English
      {
        version: '1.0.0',
        title: 'Employee Data Policy',
        content: `<h2>Employee Data Policy</h2>
<p>For company employees</p>

<h3>Information We Collect</h3>
<ul>
<li>Employee ID</li>
<li>Full Name</li>
<li>Position</li>
<li>Department</li>
<li>Salary</li>
<li>Work History</li>
</ul>

<p>This information will be used for HR management purposes only</p>`,
        language: 'en-US',
        user_type: 'employee'
      },
      // Partner - Thai
      {
        version: '1.0.0',
        title: 'นโยบายพันธมิตรธุรกิจ',
        content: `<h2>นโยบายพันธมิตรธุรกิจ</h2>
<p>สำหรับพันธมิตรทางธุรกิจ</p>

<h3>ข้อมูลที่เราเก็บ</h3>
<ul>
<li>ชื่อบริษัท</li>
<li>เลขทะเบียนนิติบุคคล</li>
<li>ที่อยู่บริษัท</li>
<li>ผู้ติดต่อหลัก</li>
<li>ข้อมูลทางการเงิน</li>
</ul>

<p>ข้อมูลจะใช้เพื่อการดำเนินธุรกิจร่วมกันเท่านั้น</p>`,
        language: 'th-TH',
        user_type: 'partner'
      },
      // Vendor - Thai
      {
        version: '1.0.0',
        title: 'นโยบายผู้ขายสินค้า',
        content: `<h2>นโยบายผู้ขายสินค้า</h2>
<p>สำหรับผู้ขายสินค้าและบริการ</p>

<h3>ข้อมูลที่จำเป็น</h3>
<ul>
<li>รหัสผู้ขาย</li>
<li>ชื่อบริษัท/ร้านค้า</li>
<li>ประเภทสินค้า/บริการ</li>
<li>เงื่อนไขการชำระเงิน</li>
<li>ข้อมูลบัญชีธนาคาร</li>
</ul>

<p>ข้อมูลใช้เพื่อการจัดซื้อจัดจ้างเท่านั้น</p>`,
        language: 'th-TH',
        user_type: 'vendor'
      },
      // Contractor - Thai
      {
        version: '1.0.0',
        title: 'นโยบายผู้รับเหมา',
        content: `<h2>นโยบายผู้รับเหมา</h2>
<p>สำหรับผู้รับเหมาและผู้รับจ้างอิสระ</p>

<h3>ข้อมูลที่เก็บ</h3>
<ul>
<li>รหัสผู้รับเหมา</li>
<li>ประเภทงาน</li>
<li>ระยะเวลาสัญญา</li>
<li>อัตราค่าจ้าง</li>
<li>ผลงานที่ผ่านมา</li>
</ul>

<p>ข้อมูลใช้เพื่อการบริหารสัญญาจ้างเท่านั้น</p>`,
        language: 'th-TH',
        user_type: 'contractor'
      }
    ];
    
    for (const policy of policies) {
      await pool.query(
        `INSERT INTO policy_versions 
         (version, title, content, language, user_type, is_active, effective_date) 
         VALUES ($1, $2, $3, $4, $5, true, NOW())`,
        [policy.version, policy.title, policy.content, policy.language, policy.user_type]
      );
      console.log(`✅ Created: ${policy.user_type} - ${policy.language}`);
    }
    
    // 4. Test fetching
    console.log('\n📋 Testing Policy Fetch:');
    console.log('------------------------');
    
    const tests = [
      { user: 'customer', lang: 'th-TH' },
      { user: 'customer', lang: 'en-US' },
      { user: 'employee', lang: 'th-TH' },
      { user: 'partner', lang: 'th-TH' },
      { user: 'vendor', lang: 'th-TH' }
    ];
    
    for (const test of tests) {
      const result = await pool.query(
        `SELECT title FROM policy_versions 
         WHERE user_type = $1 AND language = $2 AND is_active = true`,
        [test.user, test.lang]
      );
      
      if (result.rows.length > 0) {
        console.log(`✅ ${test.user}/${test.lang}: "${result.rows[0].title}"`);
      } else {
        console.log(`❌ ${test.user}/${test.lang}: Not found`);
      }
    }
    
    console.log('\n✅ Policy system fixed!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

fixPolicySystem();
