const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '4321',
  database: 'consent'
});

async function cleanAndTestPolicies() {
  const client = await pool.connect();
  
  try {
    console.log('🧹 ทำความสะอาดและทดสอบระบบ Policy\n');
    console.log('='.repeat(50));
    
    // 1. ลบ policies ที่ซ้ำกัน - เก็บแค่ล่าสุด
    console.log('\n1. ลบ policies ที่ซ้ำ:');
    await client.query(`
      DELETE FROM policy_versions
      WHERE id NOT IN (
        SELECT MAX(id)
        FROM policy_versions
        GROUP BY user_type, language, title
      )
    `);
    console.log('   ✅ ลบ duplicates แล้ว');
    
    // 2. แสดง policies ที่มีอยู่
    console.log('\n2. Policies ที่มีอยู่:');
    const existing = await client.query(`
      SELECT id, user_type, language, title, is_active
      FROM policy_versions
      ORDER BY user_type, language, title
    `);
    
    if (existing.rows.length === 0) {
      console.log('   ❌ ไม่มี policy ในฐานข้อมูล');
    } else {
      existing.rows.forEach(p => {
        const status = p.is_active ? '✅' : '❌';
        console.log(`   ${status} ID ${p.id}: ${p.user_type}/${p.language} = "${p.title}"`);
      });
    }
    
    // 3. ทดสอบสร้าง policy ใหม่
    console.log('\n3. ทดสอบสร้าง/อัพเดท policies:');
    
    const testPolicies = [
      { title: '001', user_type: 'customer', language: 'th', content: '<p>นโยบายลูกค้าภาษาไทย</p>' },
      { title: '002', user_type: 'customer', language: 'en', content: '<p>Customer Policy English</p>' },
      { title: '003', user_type: 'employee', language: 'th', content: '<p>นโยบายพนักงานภาษาไทย</p>' }
    ];
    
    for (const policy of testPolicies) {
      // Check if exists
      const check = await client.query(
        `SELECT id FROM policy_versions 
         WHERE title = $1 AND user_type = $2 AND language = $3`,
        [policy.title, policy.user_type, policy.language]
      );
      
      if (check.rows.length > 0) {
        // Update existing
        await client.query(
          `UPDATE policy_versions 
           SET content = $1, is_active = true, updated_at = NOW()
           WHERE id = $2`,
          [policy.content, check.rows[0].id]
        );
        console.log(`   ✅ Updated ${policy.title} (${policy.user_type}/${policy.language})`);
      } else {
        // Create new
        await client.query(
          `INSERT INTO policy_versions (title, user_type, language, content, version, is_active)
           VALUES ($1, $2, $3, $4, '1.0', true)`,
          [policy.title, policy.user_type, policy.language, policy.content]
        );
        console.log(`   ✅ Created ${policy.title} (${policy.user_type}/${policy.language})`);
      }
    }
    
    // 4. แสดงผลลัพธ์สุดท้าย
    console.log('\n4. ผลลัพธ์สุดท้าย:');
    const final = await client.query(`
      SELECT user_type, language, title
      FROM policy_versions
      WHERE is_active = true
      ORDER BY user_type, language
    `);
    
    final.rows.forEach(p => {
      console.log(`   ✅ ${p.user_type}/${p.language}: "${p.title}"`);
    });
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ ระบบพร้อมใช้งาน!\n');
    console.log('ทดสอบ:');
    console.log('• ลูกค้าไทย: http://localhost:5000/consent/customer?lang=th → 001');
    console.log('• ลูกค้าอังกฤษ: http://localhost:5000/consent/customer?lang=en → 002');
    console.log('• พนักงานไทย: http://localhost:5000/consent/employee?lang=th → 003');
    console.log('\nสร้าง Policy ใหม่: http://localhost:5000/admin/create-policy');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

cleanAndTestPolicies();
