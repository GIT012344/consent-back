const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'consent',
  user: 'postgres',
  password: '4321'
});

async function testMultipleVersions() {
  try {
    console.log('🔧 สร้าง Policy หลายเวอร์ชันสำหรับ UserType เดียวกัน...\n');
    
    // ลบข้อมูลเก่าทั้งหมด
    await pool.query('DELETE FROM policy_versions');
    console.log('✅ ลบข้อมูลเก่า\n');
    
    // สร้าง Policy ใหม่
    const policies = [
      // พนักงาน ภาษาไทย - 2 เวอร์ชัน
      {
        version: 'EMP-TH-001',
        title: 'นโยบายพนักงาน 001',
        content: '<h2>นโยบายพนักงาน เวอร์ชัน 001</h2><p>เนื้อหาเวอร์ชัน 001</p>',
        language: 'th-TH',
        user_type: 'employee',
        is_active: true
      },
      {
        version: 'EMP-TH-002',
        title: 'นโยบายพนักงาน 002',
        content: '<h2>นโยบายพนักงาน เวอร์ชัน 002</h2><p>เนื้อหาเวอร์ชัน 002 (ใหม่กว่า)</p>',
        language: 'th-TH',
        user_type: 'employee',
        is_active: false
      },
      // ลูกค้า ภาษาไทย - 1 เวอร์ชัน
      {
        version: 'CUST-TH-001',
        title: 'นโยบายลูกค้า',
        content: '<h2>นโยบายลูกค้า</h2><p>เนื้อหาลูกค้า</p>',
        language: 'th-TH',
        user_type: 'customer',
        is_active: true
      },
      // ลูกค้า อังกฤษ - 1 เวอร์ชัน
      {
        version: 'CUST-EN-001',
        title: 'Customer Policy',
        content: '<h2>Customer Policy</h2><p>Customer content</p>',
        language: 'en-US',
        user_type: 'customer',
        is_active: true
      }
    ];
    
    for (const policy of policies) {
      const result = await pool.query(
        `INSERT INTO policy_versions 
         (version, title, content, language, user_type, is_active, created_at) 
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         RETURNING id`,
        [policy.version, policy.title, policy.content, policy.language, policy.user_type, policy.is_active]
      );
      const status = policy.is_active ? '✅ ACTIVE' : '⏸️ INACTIVE';
      console.log(`สร้าง [${result.rows[0].id}]: ${policy.version} - ${policy.title} ${status}`);
    }
    
    console.log('\n📊 สรุป:');
    const all = await pool.query('SELECT * FROM policy_versions ORDER BY user_type, language, version');
    
    console.log('\nID | Version      | UserType | Language | Active | Title');
    console.log('---|--------------|----------|----------|--------|------');
    all.rows.forEach(p => {
      const active = p.is_active ? 'YES' : 'NO';
      console.log(`${p.id.toString().padEnd(2)} | ${p.version.padEnd(12)} | ${p.user_type.padEnd(8)} | ${p.language.padEnd(8)} | ${active.padEnd(6)} | ${p.title}`);
    });
    
    console.log('\n✅ เสร็จสิ้น!');
    console.log('\n📌 วิธีใช้งาน:');
    console.log('1. หน้า Policy Management จะแสดงทุกเวอร์ชัน');
    console.log('2. สามารถ toggle active/inactive แต่ละเวอร์ชัน');
    console.log('3. ระบบจะใช้เวอร์ชันที่ active สำหรับแต่ละ userType/language');
    console.log('4. ถ้าต้องการเปลี่ยนจาก 001 เป็น 002:');
    console.log('   - ปิด 001 (inactive)');
    console.log('   - เปิด 002 (active)');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

testMultipleVersions();
