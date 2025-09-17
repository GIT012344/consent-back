const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'consent',
  user: 'postgres',
  password: '4321'
});

async function fixAllIssues() {
  try {
    console.log('🔧 แก้ไขปัญหาทั้งหมด...\n');
    
    // 1. ลบข้อมูลเก่าที่ผิด
    await pool.query('DELETE FROM policy_versions');
    console.log('✅ ลบข้อมูลเก่า');
    
    // 2. สร้าง policies ใหม่ที่ถูกต้อง
    const policies = [
      // Customer - Thai (ลูกค้าภาษาไทย)
      {
        version: '1.0.0',
        title: 'นโยบายความเป็นส่วนตัวลูกค้า',
        content: `<h2>นโยบายความเป็นส่วนตัว</h2>
<p>เรายินดีต้อนรับท่านสู่บริการของเรา</p>
<p><br></p>
<p>ข้อมูลส่วนบุคคลที่เราเก็บรวบรวม:</p>
<ul>
<li>ชื่อ-นามสกุล</li>
<li>เลขบัตรประชาชน</li>
<li>ที่อยู่</li>
<li>เบอร์โทรศัพท์</li>
<li>อีเมล</li>
</ul>
<p><br></p>
<p>วัตถุประสงค์ในการเก็บข้อมูล:</p>
<ol>
<li>เพื่อให้บริการตามที่ท่านร้องขอ</li>
<li>เพื่อปรับปรุงคุณภาพการให้บริการ</li>
<li>เพื่อติดต่อสื่อสารกับท่าน</li>
</ol>
<p><br></p>
<p>เราจะเก็บรักษาข้อมูลของท่านอย่างปลอดภัยและไม่เปิดเผยต่อบุคคลที่สามโดยไม่ได้รับความยินยอม</p>`,
        language: 'th-TH',
        user_type: 'customer'
      },
      
      // Customer - English (ลูกค้าภาษาอังกฤษ)
      {
        version: '1.0.0',
        title: 'Customer Privacy Policy',
        content: `<h2>Privacy Policy</h2>
<p>Welcome to our service</p>
<p><br></p>
<p>Personal information we collect:</p>
<ul>
<li>Full Name</li>
<li>ID/Passport Number</li>
<li>Address</li>
<li>Phone Number</li>
<li>Email</li>
</ul>
<p><br></p>
<p>Purpose of data collection:</p>
<ol>
<li>To provide services as requested</li>
<li>To improve service quality</li>
<li>To communicate with you</li>
</ol>
<p><br></p>
<p>We will keep your information secure and will not disclose to third parties without consent</p>`,
        language: 'en-US',
        user_type: 'customer'
      },
      
      // Employee - Thai (พนักงาน)
      {
        version: '1.0.0',
        title: 'นโยบายข้อมูลพนักงาน',
        content: `<h2>นโยบายข้อมูลพนักงาน</h2>
<p>สำหรับพนักงานของบริษัท</p>
<p><br></p>
<p>ข้อมูลที่บริษัทเก็บรวบรวม:</p>
<ul>
<li>รหัสพนักงาน</li>
<li>ชื่อ-นามสกุล</li>
<li>ตำแหน่งงาน</li>
<li>แผนก</li>
<li>เงินเดือน</li>
<li>ประวัติการทำงาน</li>
</ul>
<p><br></p>
<p>ข้อมูลเหล่านี้จะใช้เพื่อการบริหารทรัพยากรบุคคลเท่านั้น</p>`,
        language: 'th-TH',
        user_type: 'employee'
      },
      
      // Partner - Thai (พันธมิตร)
      {
        version: '1.0.0',
        title: 'นโยบายพันธมิตรธุรกิจ',
        content: `<h2>นโยบายพันธมิตรธุรกิจ</h2>
<p>สำหรับพันธมิตรทางธุรกิจ</p>
<p><br></p>
<p>ข้อมูลที่เราเก็บ:</p>
<ul>
<li>ชื่อบริษัท</li>
<li>เลขทะเบียนนิติบุคคล</li>
<li>ที่อยู่บริษัท</li>
<li>ผู้ติดต่อหลัก</li>
<li>ข้อมูลทางการเงิน</li>
</ul>
<p><br></p>
<p>ข้อมูลจะใช้เพื่อการดำเนินธุรกิจร่วมกันเท่านั้น</p>`,
        language: 'th-TH',
        user_type: 'partner'
      },
      
      // Vendor - Thai (ผู้ขาย)
      {
        version: '1.0.0',
        title: 'นโยบายผู้ขายสินค้า',
        content: `<h2>นโยบายผู้ขายสินค้า</h2>
<p>สำหรับผู้ขายสินค้าและบริการ</p>
<p><br></p>
<p>ข้อมูลที่จำเป็น:</p>
<ul>
<li>รหัสผู้ขาย</li>
<li>ชื่อบริษัท/ร้านค้า</li>
<li>ประเภทสินค้า/บริการ</li>
<li>เงื่อนไขการชำระเงิน</li>
<li>ข้อมูลบัญชีธนาคาร</li>
</ul>
<p><br></p>
<p>ข้อมูลใช้เพื่อการจัดซื้อจัดจ้างเท่านั้น</p>`,
        language: 'th-TH',
        user_type: 'vendor'
      },
      
      // Contractor - Thai (ผู้รับเหมา)
      {
        version: '1.0.0',
        title: 'นโยบายผู้รับเหมา',
        content: `<h2>นโยบายผู้รับเหมา</h2>
<p>สำหรับผู้รับเหมาและผู้รับจ้างอิสระ</p>
<p><br></p>
<p>ข้อมูลที่เก็บ:</p>
<ul>
<li>รหัสผู้รับเหมา</li>
<li>ประเภทงาน</li>
<li>ระยะเวลาสัญญา</li>
<li>อัตราค่าจ้าง</li>
<li>ผลงานที่ผ่านมา</li>
</ul>
<p><br></p>
<p>ข้อมูลใช้เพื่อการบริหารสัญญาจ้างเท่านั้น</p>`,
        language: 'th-TH',
        user_type: 'contractor'
      }
    ];
    
    // บันทึก policies
    for (const policy of policies) {
      await pool.query(
        `INSERT INTO policy_versions 
         (version, title, content, language, user_type, is_active, effective_date) 
         VALUES ($1, $2, $3, $4, $5, true, NOW())`,
        [policy.version, policy.title, policy.content, policy.language, policy.user_type]
      );
      console.log(`✅ สร้าง: ${policy.user_type} - ${policy.language}`);
    }
    
    // 3. ตรวจสอบผลลัพธ์
    console.log('\n📋 ตรวจสอบผลลัพธ์:');
    console.log('==================');
    
    const result = await pool.query(`
      SELECT user_type, language, title 
      FROM policy_versions 
      ORDER BY user_type, language
    `);
    
    result.rows.forEach(r => {
      console.log(`✓ ${r.user_type} | ${r.language} | ${r.title}`);
    });
    
    console.log('\n✅ แก้ไขเสร็จสมบูรณ์!');
    console.log('\n📌 วิธีใช้งาน:');
    console.log('==============');
    console.log('1. Customer: http://localhost:3003/consent/select-language');
    console.log('   - เลือกภาษาไทย → แสดง "นโยบายความเป็นส่วนตัวลูกค้า"');
    console.log('   - เลือกภาษาอังกฤษ → แสดง "Customer Privacy Policy"');
    console.log('');
    console.log('2. UserType อื่นๆ (Admin ส่งลิงก์):');
    console.log('   - Employee: http://localhost:3003/consent/employee?lang=th');
    console.log('   - Partner: http://localhost:3003/consent/partner?lang=th');
    console.log('   - Vendor: http://localhost:3003/consent/vendor?lang=th');
    console.log('   - Contractor: http://localhost:3003/consent/contractor?lang=th');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

fixAllIssues();
