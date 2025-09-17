const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'consent',
  user: 'postgres',
  password: '4321'
});

async function finalFix() {
  try {
    console.log('🔧 แก้ไขครั้งสุดท้าย...\n');
    
    // 1. สร้างตารางใหม่ถ้ายังไม่มี
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
    
    // 3. สร้าง Policies ที่ถูกต้อง
    const policies = [
      {
        version: '1.0.0',
        title: 'นโยบายความเป็นส่วนตัว - ลูกค้า (ภาษาไทย)',
        content: `<h2>นโยบายความเป็นส่วนตัว</h2>
<p>ยินดีต้อนรับลูกค้าทุกท่าน</p>
<p><br></p>
<p>ข้อมูลที่เราเก็บรวบรวม:</p>
<ul>
<li>ชื่อ-นามสกุล</li>
<li>เลขบัตรประชาชน</li>
<li>ที่อยู่</li>
<li>เบอร์โทรศัพท์</li>
</ul>
<p><br></p>
<p>เราจะเก็บรักษาข้อมูลของท่านอย่างปลอดภัย</p>`,
        language: 'th-TH',
        user_type: 'customer'
      },
      {
        version: '1.0.0',
        title: 'Privacy Policy - Customer (English)',
        content: `<h2>Privacy Policy</h2>
<p>Welcome to our service</p>
<p><br></p>
<p>Information we collect:</p>
<ul>
<li>Full Name</li>
<li>ID/Passport Number</li>
<li>Address</li>
<li>Phone Number</li>
</ul>
<p><br></p>
<p>We will keep your information secure</p>`,
        language: 'en-US',
        user_type: 'customer'
      },
      {
        version: '1.0.0',
        title: 'นโยบายข้อมูลพนักงาน',
        content: `<h2>นโยบายพนักงาน</h2>
<p>สำหรับพนักงานบริษัท</p>
<p><br></p>
<ul>
<li>รหัสพนักงาน</li>
<li>ตำแหน่ง</li>
<li>แผนก</li>
</ul>`,
        language: 'th-TH',
        user_type: 'employee'
      },
      {
        version: '1.0.0',
        title: 'นโยบายพันธมิตรธุรกิจ',
        content: `<h2>นโยบายพันธมิตร</h2>
<p>สำหรับพันธมิตรธุรกิจ</p>
<p><br></p>
<ul>
<li>ชื่อบริษัท</li>
<li>เลขทะเบียน</li>
</ul>`,
        language: 'th-TH',
        user_type: 'partner'
      },
      {
        version: '1.0.0',
        title: 'นโยบายผู้ขาย',
        content: `<h2>นโยบายผู้ขาย</h2>
<p>สำหรับผู้ขายสินค้า</p>
<p><br></p>
<ul>
<li>รหัสผู้ขาย</li>
<li>ประเภทสินค้า</li>
</ul>`,
        language: 'th-TH',
        user_type: 'vendor'
      },
      {
        version: '1.0.0',
        title: 'นโยบายผู้รับเหมา',
        content: `<h2>นโยบายผู้รับเหมา</h2>
<p>สำหรับผู้รับเหมา</p>
<p><br></p>
<ul>
<li>รหัสผู้รับเหมา</li>
<li>ประเภทงาน</li>
</ul>`,
        language: 'th-TH',
        user_type: 'contractor'
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
      console.log(`✅ ${policy.user_type} - ${policy.language}: "${policy.title}" (ID: ${result.rows[0].id})`);
    }
    
    // 4. ตรวจสอบผลลัพธ์
    console.log('\n📊 Policies ทั้งหมด:');
    const allPolicies = await pool.query(`
      SELECT id, user_type, language, title 
      FROM policy_versions 
      WHERE is_active = true
      ORDER BY 
        CASE user_type 
          WHEN 'customer' THEN 1
          WHEN 'employee' THEN 2
          WHEN 'partner' THEN 3
          WHEN 'vendor' THEN 4
          WHEN 'contractor' THEN 5
        END,
        language
    `);
    
    allPolicies.rows.forEach(p => {
      console.log(`[${p.id}] ${p.user_type.padEnd(10)} | ${p.language.padEnd(8)} | ${p.title}`);
    });
    
    console.log('\n✅ เสร็จสมบูรณ์!');
    console.log('\n📌 วิธีใช้งาน:');
    console.log('=====================================');
    console.log('1. CUSTOMER (เลือกภาษา):');
    console.log('   URL: http://localhost:3003/consent/select-language');
    console.log('   - เลือก "ภาษาไทย" → แสดง "นโยบายความเป็นส่วนตัว - ลูกค้า (ภาษาไทย)"');
    console.log('   - เลือก "English" → แสดง "Privacy Policy - Customer (English)"');
    console.log('');
    console.log('2. USER TYPE อื่นๆ (ลิงก์ตรง):');
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

finalFix();
