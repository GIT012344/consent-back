const { Pool } = require('pg');
const axios = require('axios');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '4321',
  database: 'consent'
});

async function verifyContentSystem() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 ตรวจสอบระบบการแสดงเนื้อหา\n');
    console.log('='.repeat(80));
    
    // 1. ดูเนื้อหาจริงในฐานข้อมูล
    console.log('📊 เนื้อหาในฐานข้อมูล:\n');
    const policies = await client.query(`
      SELECT id, user_type, language, title, content
      FROM policy_versions
      WHERE is_active = true
      ORDER BY user_type, language
    `);
    
    if (policies.rows.length === 0) {
      console.log('❌ ไม่พบ policy ในฐานข้อมูล!');
      console.log('\n💡 วิธีแก้ไข:');
      console.log('1. ไปที่ http://localhost:5000/admin/create-policy');
      console.log('2. สร้าง Policy ใหม่');
      console.log('3. กรอก Title, User Type, Language และ Content');
      console.log('4. กด Save');
      return;
    }
    
    policies.rows.forEach(p => {
      console.log(`ID ${p.id}: ${p.user_type}/${p.language}`);
      console.log(`Title: "${p.title}"`);
      console.log(`Content:`);
      console.log('-'.repeat(60));
      console.log(p.content);
      console.log('-'.repeat(60));
      console.log('');
    });
    
    // 2. ทดสอบ API
    console.log('🔌 ทดสอบ API:\n');
    
    const tests = [
      { userType: 'customer', language: 'th', desc: 'ลูกค้าไทย' },
      { userType: 'customer', language: 'en', desc: 'ลูกค้าอังกฤษ' },
      { userType: 'employee', language: 'th', desc: 'พนักงานไทย' }
    ];
    
    for (const test of tests) {
      try {
        const res = await axios.get(
          `http://localhost:3000/api/simple-policy/active?userType=${test.userType}&language=${test.language}`
        );
        
        if (res.data.success && res.data.data) {
          console.log(`✅ ${test.desc}:`);
          console.log(`   Title: "${res.data.data.title}"`);
          console.log(`   Content: ${res.data.data.content?.substring(0, 100)}...`);
        } else {
          console.log(`❌ ${test.desc}: ไม่พบข้อมูล`);
        }
      } catch (err) {
        console.log(`❌ ${test.desc}: Backend ไม่ทำงาน`);
      }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('\n✅ วิธีการใช้งานที่ถูกต้อง:\n');
    console.log('1. สร้าง Policy:');
    console.log('   - ไปที่ http://localhost:5000/admin/create-policy');
    console.log('   - กรอก Title, User Type, Language');
    console.log('   - พิมพ์เนื้อหาที่ต้องการใน Content');
    console.log('   - กด Save');
    console.log('\n2. ทดสอบ:');
    console.log('   - ลูกค้าไทย: http://localhost:5000/consent/customer?lang=th');
    console.log('   - ลูกค้าอังกฤษ: http://localhost:5000/consent/customer?lang=en');
    console.log('   - พนักงานไทย: http://localhost:5000/consent/employee?lang=th');
    console.log('\n3. เนื้อหาที่แสดงจะเป็นเนื้อหาที่ Admin พิมพ์ไว้');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

verifyContentSystem();
