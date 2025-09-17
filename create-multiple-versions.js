const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'consent',
  user: 'postgres',
  password: '4321'
});

async function createMultipleVersions() {
  try {
    console.log('🔧 สร้าง Policy หลายเวอร์ชันสำหรับ UserType เดียวกัน...\n');
    
    // สร้าง Policy พนักงาน ภาษาไทย 2 เวอร์ชัน
    const policies = [
      {
        version: 'EMP-TH-001',
        title: 'นโยบายพนักงาน เวอร์ชัน 001',
        content: '<h2>นโยบายพนักงาน V.001</h2><p>นี่คือเนื้อหาสำหรับพนักงาน เวอร์ชัน 001</p><ul><li>ข้อกำหนดเวอร์ชัน 001</li><li>เงื่อนไขเวอร์ชัน 001</li></ul>',
        language: 'th-TH',
        user_type: 'employee',
        is_active: true  // เวอร์ชัน 001 active
      },
      {
        version: 'EMP-TH-002',
        title: 'นโยบายพนักงาน เวอร์ชัน 002',
        content: '<h2>นโยบายพนักงาน V.002</h2><p>นี่คือเนื้อหาสำหรับพนักงาน เวอร์ชัน 002 (ใหม่กว่า)</p><ul><li>ข้อกำหนดเวอร์ชัน 002 ที่อัพเดท</li><li>เงื่อนไขเวอร์ชัน 002 ที่ปรับปรุง</li></ul>',
        language: 'th-TH',
        user_type: 'employee',
        is_active: false  // เวอร์ชัน 002 inactive (สำรอง)
      },
      // เพิ่ม Customer หลายเวอร์ชันด้วย
      {
        version: 'CUST-TH-001',
        title: 'นโยบายลูกค้า เวอร์ชัน 001',
        content: '<h2>นโยบายลูกค้า V.001</h2><p>เนื้อหาสำหรับลูกค้า เวอร์ชัน 001</p>',
        language: 'th-TH',
        user_type: 'customer',
        is_active: true
      },
      {
        version: 'CUST-TH-002',
        title: 'นโยบายลูกค้า เวอร์ชัน 002',
        content: '<h2>นโยบายลูกค้า V.002</h2><p>เนื้อหาสำหรับลูกค้า เวอร์ชัน 002 (ทดสอบ)</p>',
        language: 'th-TH',
        user_type: 'customer',
        is_active: false
      }
    ];
    
    // ลบข้อมูลเก่า (optional)
    // await pool.query('DELETE FROM policy_versions');
    
    // สร้าง policies ใหม่
    for (const policy of policies) {
      const result = await pool.query(
        `INSERT INTO policy_versions 
         (version, title, content, language, user_type, is_active, created_at) 
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         RETURNING id`,
        [policy.version, policy.title, policy.content, policy.language, policy.user_type, policy.is_active]
      );
      console.log(`✅ สร้าง: ${policy.title} (ID: ${result.rows[0].id}) - ${policy.is_active ? 'ACTIVE' : 'INACTIVE'}`);
    }
    
    // แสดงสรุป
    console.log('\n📊 สรุป Policy ที่มีในระบบ:');
    const summary = await pool.query(`
      SELECT user_type, language, COUNT(*) as count,
             SUM(CASE WHEN is_active THEN 1 ELSE 0 END) as active_count
      FROM policy_versions
      GROUP BY user_type, language
      ORDER BY user_type, language
    `);
    
    console.log('\nUserType | Language | Total | Active');
    console.log('---------|----------|-------|-------');
    summary.rows.forEach(row => {
      console.log(`${row.user_type.padEnd(8)} | ${row.language.padEnd(8)} | ${row.count.toString().padEnd(5)} | ${row.active_count}`);
    });
    
    // แสดง Policy ทั้งหมด
    console.log('\n📋 รายละเอียด Policy ทั้งหมด:');
    const allPolicies = await pool.query(`
      SELECT id, version, title, user_type, language, is_active
      FROM policy_versions
      ORDER BY user_type, language, version
    `);
    
    allPolicies.rows.forEach(p => {
      const status = p.is_active ? '✅ ACTIVE' : '⏸️ INACTIVE';
      console.log(`[${p.id}] ${p.version} - ${p.title} (${p.user_type}/${p.language}) ${status}`);
    });
    
    console.log('\n⚠️ หมายเหตุ:');
    console.log('1. ระบบจะใช้ Policy ที่ is_active = true');
    console.log('2. ถ้ามีหลาย active สำหรับ userType/language เดียวกัน จะใช้ตัวล่าสุด');
    console.log('3. สามารถ toggle active/inactive ได้ที่หน้า Policy Management');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

createMultipleVersions();
