const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'consent',
  user: 'postgres',
  password: '4321'
});

async function setupTestPolicies() {
  try {
    console.log('🔧 สร้าง Policy ทดสอบใหม่...\n');
    
    // 1. ลบข้อมูลเก่า
    await pool.query('DELETE FROM policy_versions');
    console.log('✅ ลบข้อมูลเก่า\n');
    
    // 2. สร้าง Policy ใหม่
    const policies = [
      {
        version: 'v1.0-customer-th',
        title: 'นโยบายลูกค้า ภาษาไทย',
        content: '<h1>นโยบายสำหรับลูกค้า</h1><p>นี่คือเนื้อหาที่คุณสร้างสำหรับลูกค้า ภาษาไทย</p><p>สร้างเมื่อ: ' + new Date().toLocaleString('th-TH') + '</p>',
        language: 'th-TH',
        user_type: 'customer'
      },
      {
        version: 'v1.0-customer-en',
        title: 'Customer Policy English',
        content: '<h1>Policy for Customers</h1><p>This is the content you created for customers in English</p><p>Created: ' + new Date().toLocaleString('en-US') + '</p>',
        language: 'en-US',
        user_type: 'customer'
      },
      {
        version: 'v1.0-employee-th',
        title: 'นโยบายพนักงาน',
        content: '<h1>นโยบายสำหรับพนักงาน</h1><p>นี่คือเนื้อหาที่คุณสร้างสำหรับพนักงาน</p><p>สร้างเมื่อ: ' + new Date().toLocaleString('th-TH') + '</p>',
        language: 'th-TH',
        user_type: 'employee'
      },
      {
        version: 'v1.0-partner-th',
        title: 'นโยบายพันธมิตร',
        content: '<h1>นโยบายสำหรับพันธมิตร</h1><p>นี่คือเนื้อหาที่คุณสร้างสำหรับพันธมิตร</p><p>สร้างเมื่อ: ' + new Date().toLocaleString('th-TH') + '</p>',
        language: 'th-TH',
        user_type: 'partner'
      }
    ];
    
    for (const policy of policies) {
      await pool.query(
        `INSERT INTO policy_versions 
         (version, title, content, language, user_type, is_active, created_at) 
         VALUES ($1, $2, $3, $4, $5, true, NOW())`,
        [policy.version, policy.title, policy.content, policy.language, policy.user_type]
      );
      console.log(`✅ สร้าง: ${policy.title}`);
    }
    
    // 3. ตรวจสอบ
    console.log('\n📊 Policies ที่สร้าง:\n');
    const check = await pool.query('SELECT * FROM policy_versions ORDER BY version');
    
    check.rows.forEach(p => {
      console.log(`[${p.version}] ${p.user_type} - ${p.language}`);
      console.log(`Title: ${p.title}`);
      console.log(`Content: ${p.content}`);
      console.log('---\n');
    });
    
    console.log('✅ เสร็จสิ้น!\n');
    console.log('⚠️ รีสตาร์ท Backend: Ctrl+C แล้ว node server.js');
    console.log('\n📌 ทดสอบ:');
    console.log('Customer Thai: http://localhost:3003/consent/select-language → เลือก "ภาษาไทย"');
    console.log('Customer English: http://localhost:3003/consent/select-language → เลือก "English"');
    console.log('Employee: http://localhost:3003/consent/employee?lang=th');
    console.log('Partner: http://localhost:3003/consent/partner?lang=th');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

setupTestPolicies();
