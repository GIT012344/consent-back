const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'consent',
  user: 'postgres',
  password: '4321'
});

async function completeFix() {
  try {
    console.log('🔧 แก้ไขระบบทั้งหมด...\n');
    
    // 1. ลบข้อมูลเก่าและสร้างใหม่
    await pool.query('DELETE FROM policy_versions');
    console.log('✅ ลบข้อมูลเก่า');
    
    // 2. สร้าง Policies ตามที่ต้องการ
    const policies = [
      // Customer Thai - ลูกค้าเลือกภาษาไทย
      {
        version: '1.0.0',
        title: 'นโยบายลูกค้า (ภาษาไทย)',
        content: `<h2>นโยบายความเป็นส่วนตัว - ลูกค้า</h2>
<p>ยินดีต้อนรับลูกค้าทุกท่าน (ภาษาไทย)</p>
<p>&nbsp;</p>
<p>ข้อมูลที่เราเก็บรวบรวม:</p>
<ul>
<li>ชื่อ-นามสกุล</li>
<li>เลขบัตรประชาชน</li>
<li>ที่อยู่</li>
<li>เบอร์โทรศัพท์</li>
<li>อีเมล</li>
</ul>
<p>&nbsp;</p>
<p>วัตถุประสงค์:</p>
<ol>
<li>เพื่อให้บริการ</li>
<li>เพื่อติดต่อสื่อสาร</li>
<li>เพื่อปรับปรุงบริการ</li>
</ol>
<p>&nbsp;</p>
<p>เราจะเก็บรักษาข้อมูลของท่านอย่างปลอดภัย</p>`,
        language: 'th-TH',
        user_type: 'customer'
      },
      
      // Customer English - ลูกค้าเลือกภาษาอังกฤษ
      {
        version: '1.0.0',
        title: 'Customer Policy (English)',
        content: `<h2>Privacy Policy - Customer</h2>
<p>Welcome to our service (English Version)</p>
<p>&nbsp;</p>
<p>Information we collect:</p>
<ul>
<li>Full Name</li>
<li>ID/Passport Number</li>
<li>Address</li>
<li>Phone Number</li>
<li>Email</li>
</ul>
<p>&nbsp;</p>
<p>Purpose:</p>
<ol>
<li>To provide services</li>
<li>To communicate</li>
<li>To improve services</li>
</ol>
<p>&nbsp;</p>
<p>We will keep your information secure</p>`,
        language: 'en-US',
        user_type: 'customer'
      },
      
      // Employee - พนักงาน
      {
        version: '1.0.0',
        title: 'นโยบายพนักงาน',
        content: `<h2>นโยบายข้อมูลพนักงาน</h2>
<p>สำหรับพนักงานบริษัท</p>
<p>&nbsp;</p>
<p>ข้อมูลที่เก็บ:</p>
<ul>
<li>รหัสพนักงาน</li>
<li>ชื่อ-นามสกุล</li>
<li>ตำแหน่ง</li>
<li>แผนก</li>
<li>เงินเดือน</li>
</ul>
<p>&nbsp;</p>
<p>ใช้เพื่อการบริหารทรัพยากรบุคคล</p>`,
        language: 'th-TH',
        user_type: 'employee'
      },
      
      // Partner - พันธมิตร
      {
        version: '1.0.0',
        title: 'นโยบายพันธมิตรธุรกิจ',
        content: `<h2>นโยบายพันธมิตร</h2>
<p>สำหรับพันธมิตรธุรกิจ</p>
<p>&nbsp;</p>
<p>ข้อมูลที่เก็บ:</p>
<ul>
<li>ชื่อบริษัท</li>
<li>เลขทะเบียนนิติบุคคล</li>
<li>ที่อยู่บริษัท</li>
<li>ผู้ติดต่อ</li>
</ul>
<p>&nbsp;</p>
<p>ใช้เพื่อการดำเนินธุรกิจร่วมกัน</p>`,
        language: 'th-TH',
        user_type: 'partner'
      },
      
      // Vendor - ผู้ขาย
      {
        version: '1.0.0',
        title: 'นโยบายผู้ขายสินค้า',
        content: `<h2>นโยบายผู้ขาย</h2>
<p>สำหรับผู้ขายสินค้าและบริการ</p>
<p>&nbsp;</p>
<p>ข้อมูลที่เก็บ:</p>
<ul>
<li>รหัสผู้ขาย</li>
<li>ชื่อร้าน/บริษัท</li>
<li>ประเภทสินค้า</li>
<li>เงื่อนไขการชำระเงิน</li>
</ul>
<p>&nbsp;</p>
<p>ใช้เพื่อการจัดซื้อจัดจ้าง</p>`,
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
         RETURNING id`,
        [policy.version, policy.title, policy.content, policy.language, policy.user_type]
      );
      console.log(`✅ [${result.rows[0].id}] ${policy.user_type} - ${policy.language}: "${policy.title}"`);
    }
    
    // 3. ตรวจสอบผลลัพธ์
    console.log('\n📊 Policies ทั้งหมดในระบบ:');
    console.log('================================');
    const allPolicies = await pool.query(`
      SELECT id, user_type, language, title 
      FROM policy_versions 
      WHERE is_active = true
      ORDER BY user_type, language
    `);
    
    allPolicies.rows.forEach(p => {
      let link = '';
      if (p.user_type === 'customer') {
        link = 'http://localhost:3003/consent/select-language';
      } else {
        const lang = p.language === 'th-TH' ? 'th' : 'en';
        link = `http://localhost:3003/consent/${p.user_type}?lang=${lang}`;
      }
      console.log(`[${p.id}] ${p.user_type.padEnd(10)} | ${p.language.padEnd(8)} | ${p.title}`);
      console.log(`     Link: ${link}`);
    });
    
    console.log('\n✅ เสร็จสมบูรณ์!');
    console.log('\n📌 วิธีใช้งาน:');
    console.log('=====================================');
    console.log('1. CUSTOMER (เลือกภาษา):');
    console.log('   - เข้า: http://localhost:3003/consent/select-language');
    console.log('   - เลือก "ภาษาไทย" → แสดง "นโยบายลูกค้า (ภาษาไทย)"');
    console.log('   - เลือก "English" → แสดง "Customer Policy (English)"');
    console.log('');
    console.log('2. USER TYPE อื่นๆ (ลิงก์ตรง):');
    console.log('   - Employee: http://localhost:3003/consent/employee?lang=th → "นโยบายพนักงาน"');
    console.log('   - Partner: http://localhost:3003/consent/partner?lang=th → "นโยบายพันธมิตรธุรกิจ"');
    console.log('   - Vendor: http://localhost:3003/consent/vendor?lang=th → "นโยบายผู้ขายสินค้า"');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

completeFix();
