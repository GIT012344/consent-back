const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'consent',
  user: 'postgres',
  password: '4321'
});

async function createPoliciesNow() {
  try {
    console.log('🔧 สร้าง Policies ใหม่ทั้งหมด...\n');
    
    // ลบข้อมูลเก่า
    await pool.query('DELETE FROM policy_versions');
    console.log('✅ ลบข้อมูลเก่า\n');
    
    // สร้าง policies ใหม่
    const policies = [
      {
        version: 'v2024-customer-th',
        title: 'นโยบายความเป็นส่วนตัวสำหรับลูกค้า',
        content: '<h2>นโยบายความเป็นส่วนตัว</h2><p>บริษัทให้ความสำคัญกับความเป็นส่วนตัวของท่าน</p><ul><li>เราจะเก็บข้อมูลของท่านอย่างปลอดภัย</li><li>ไม่เปิดเผยข้อมูลโดยไม่ได้รับอนุญาต</li></ul>',
        language: 'th-TH',
        user_type: 'customer'
      },
      {
        version: 'v2024-customer-en',
        title: 'Privacy Policy for Customers',
        content: '<h2>Privacy Policy</h2><p>We value your privacy</p><ul><li>Your data is secure with us</li><li>No unauthorized disclosure</li></ul>',
        language: 'en-US',
        user_type: 'customer'
      },
      {
        version: 'v2024-employee-th',
        title: 'นโยบายสำหรับพนักงาน',
        content: '<h2>นโยบายพนักงาน</h2><p>พนักงานต้องปฏิบัติตามกฎระเบียบ</p>',
        language: 'th-TH',
        user_type: 'employee'
      },
      {
        version: 'v2024-partner-th',
        title: 'นโยบายสำหรับพันธมิตร',
        content: '<h2>นโยบายพันธมิตร</h2><p>พันธมิตรต้องปฏิบัติตามข้อตกลง</p>',
        language: 'th-TH',
        user_type: 'partner'
      }
    ];
    
    for (const policy of policies) {
      const result = await pool.query(
        `INSERT INTO policy_versions 
         (version, title, content, language, user_type, is_active, created_at) 
         VALUES ($1, $2, $3, $4, $5, true, NOW())
         RETURNING id`,
        [policy.version, policy.title, policy.content, policy.language, policy.user_type]
      );
      console.log(`✅ สร้าง ID ${result.rows[0].id}: ${policy.title}`);
    }
    
    // ตรวจสอบผลลัพธ์
    console.log('\n📊 Policies ที่สร้าง:');
    const check = await pool.query('SELECT * FROM policy_versions ORDER BY id');
    
    console.log('\nID | UserType | Language | Title');
    console.log('---|----------|----------|------');
    check.rows.forEach(p => {
      console.log(`${p.id} | ${p.user_type} | ${p.language} | ${p.title}`);
    });
    
    console.log('\n✅ สร้างเสร็จสิ้น!');
    console.log('\n⚠️ ขั้นตอนต่อไป:');
    console.log('1. รีสตาร์ท Backend: Ctrl+C แล้ว node server.js');
    console.log('2. รีเฟรชหน้า Browser: Ctrl+F5');
    console.log('3. ทดสอบที่: http://localhost:3003/consent/select-language');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

createPoliciesNow();
