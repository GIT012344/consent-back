const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'consent',
  user: 'postgres',
  password: '4321'
});

async function updatePolicyContent() {
  try {
    console.log('🔧 อัพเดทเนื้อหา Policy ให้ชัดเจน...\n');
    
    // อัพเดทเนื้อหาให้แตกต่างกันชัดเจน
    const updates = [
      {
        version: '001',
        title: 'นโยบายความเป็นส่วนตัว - ลูกค้า (ภาษาไทย)',
        content: `<h2>นโยบายความเป็นส่วนตัวสำหรับลูกค้า</h2>
<p>ยินดีต้อนรับลูกค้าทุกท่าน</p>
<p>นี่คือเนื้อหาสำหรับลูกค้าภาษาไทย (Version 001)</p>
<ul>
<li>ข้อมูลส่วนบุคคล</li>
<li>การใช้บริการ</li>
<li>ความปลอดภัย</li>
</ul>
<p>เราจะเก็บรักษาข้อมูลของท่านอย่างปลอดภัย</p>`
      },
      {
        version: '002',
        title: 'Privacy Policy - Customer (English)',
        content: `<h2>Privacy Policy for Customers</h2>
<p>Welcome to all customers</p>
<p>This is content for customers in English (Version 002)</p>
<ul>
<li>Personal Information</li>
<li>Service Usage</li>
<li>Security</li>
</ul>
<p>We will keep your information secure</p>`
      },
      {
        version: '003',
        title: 'นโยบายพนักงาน',
        content: `<h2>นโยบายสำหรับพนักงาน</h2>
<p>เอกสารนี้สำหรับพนักงานเท่านั้น</p>
<p>นี่คือเนื้อหาสำหรับพนักงาน (Version 003)</p>
<ul>
<li>รหัสพนักงาน</li>
<li>ตำแหน่งงาน</li>
<li>แผนก</li>
<li>สิทธิ์การเข้าถึง</li>
</ul>
<p>พนักงานต้องปฏิบัติตามนโยบายบริษัท</p>`
      },
      {
        version: '004',
        title: 'นโยบายพันธมิตรธุรกิจ',
        content: `<h2>นโยบายสำหรับพันธมิตร</h2>
<p>เอกสารนี้สำหรับพันธมิตรธุรกิจ</p>
<p>นี่คือเนื้อหาสำหรับพันธมิตร (Version 004)</p>
<ul>
<li>ชื่อบริษัท</li>
<li>เลขทะเบียน</li>
<li>ประเภทธุรกิจ</li>
<li>ข้อตกลงความร่วมมือ</li>
</ul>
<p>พันธมิตรต้องปฏิบัติตามข้อตกลง</p>`
      }
    ];
    
    for (const policy of updates) {
      const result = await pool.query(
        `UPDATE policy_versions 
         SET title = $1, content = $2
         WHERE version = $3
         RETURNING id, version, user_type`,
        [policy.title, policy.content, policy.version]
      );
      
      if (result.rows.length > 0) {
        console.log(`✅ อัพเดท ${policy.version}: ${policy.title}`);
      }
    }
    
    // ตรวจสอบผลลัพธ์
    console.log('\n📊 เนื้อหาหลังอัพเดท:');
    const check = await pool.query(`
      SELECT version, user_type, title, LEFT(content, 100) as preview
      FROM policy_versions
      ORDER BY version
    `);
    
    check.rows.forEach(p => {
      console.log(`\n[${p.version}] ${p.user_type}`);
      console.log(`Title: ${p.title}`);
      console.log(`Preview: ${p.preview}...`);
    });
    
    console.log('\n✅ อัพเดทเนื้อหาเสร็จสิ้น!');
    console.log('\n📌 ทดสอบ:');
    console.log('1. Customer: http://localhost:3003/consent/select-language');
    console.log('   - เลือกไทย → แสดง "นโยบายความเป็นส่วนตัว - ลูกค้า (ภาษาไทย)"');
    console.log('   - เลือก English → แสดง "Privacy Policy - Customer (English)"');
    console.log('2. Employee: http://localhost:3003/consent/employee?lang=th');
    console.log('   - แสดง "นโยบายพนักงาน"');
    console.log('3. Partner: http://localhost:3003/consent/partner?lang=th');
    console.log('   - แสดง "นโยบายพันธมิตรธุรกิจ"');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

updatePolicyContent();
