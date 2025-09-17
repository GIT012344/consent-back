const { Pool } = require('pg');
const axios = require('axios');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'consent',
  user: 'postgres',
  password: '4321'
});

async function completeResetAndTest() {
  try {
    console.log('🔧 รีเซ็ตและทดสอบระบบทั้งหมด...\n');
    
    // 1. ลบข้อมูลเก่าทั้งหมด
    console.log('1. ลบข้อมูลเก่า...');
    await pool.query('DELETE FROM policy_versions');
    console.log('✅ ลบเรียบร้อย\n');
    
    // 2. สร้าง Policy ตัวอย่างที่ชัดเจน
    console.log('2. สร้าง Policy ตัวอย่าง...\n');
    
    const testPolicies = [
      {
        version: 'TEST-001',
        title: 'นี่คือ Policy ทดสอบสำหรับลูกค้า ภาษาไทย',
        content: '<h1>เนื้อหาทดสอบ Customer Thai</h1><p>นี่คือเนื้อหาที่สร้างเมื่อ ' + new Date().toLocaleString('th-TH') + '</p>',
        language: 'th-TH',
        user_type: 'customer'
      },
      {
        version: 'TEST-002',
        title: 'This is Test Policy for Customer English',
        content: '<h1>Test Content Customer English</h1><p>This content was created at ' + new Date().toLocaleString('en-US') + '</p>',
        language: 'en-US',
        user_type: 'customer'
      },
      {
        version: 'TEST-003',
        title: 'นี่คือ Policy ทดสอบสำหรับพนักงาน',
        content: '<h1>เนื้อหาทดสอบ Employee</h1><p>สร้างเมื่อ ' + new Date().toLocaleString('th-TH') + '</p>',
        language: 'th-TH',
        user_type: 'employee'
      }
    ];
    
    for (const policy of testPolicies) {
      const result = await pool.query(
        `INSERT INTO policy_versions 
         (version, title, content, language, user_type, is_active, created_at) 
         VALUES ($1, $2, $3, $4, $5, true, NOW())
         RETURNING id`,
        [policy.version, policy.title, policy.content, policy.language, policy.user_type]
      );
      console.log(`✅ สร้าง ${policy.version}: ${policy.title}`);
    }
    
    // 3. ตรวจสอบว่าบันทึกลงฐานข้อมูลจริง
    console.log('\n3. ตรวจสอบในฐานข้อมูล...\n');
    const checkDb = await pool.query('SELECT * FROM policy_versions ORDER BY version');
    
    checkDb.rows.forEach(p => {
      console.log(`[${p.version}] ${p.user_type} - ${p.language}`);
      console.log(`Title: ${p.title}`);
      console.log(`Content: ${p.content}`);
      console.log('---');
    });
    
    // 4. ทดสอบ API
    console.log('\n4. ทดสอบ API Endpoints...\n');
    
    const tests = [
      { userType: 'customer', language: 'th-TH', expected: 'TEST-001' },
      { userType: 'customer', language: 'en-US', expected: 'TEST-002' },
      { userType: 'employee', language: 'th-TH', expected: 'TEST-003' }
    ];
    
    for (const test of tests) {
      console.log(`\nTest: ${test.userType} - ${test.language}`);
      try {
        const res = await axios.get(
          `http://localhost:3000/api/simple-policy/active?userType=${test.userType}&language=${test.language}`
        );
        
        if (res.data.success && res.data.data) {
          console.log(`✅ API Response:`);
          console.log(`   Version: ${res.data.data.version}`);
          console.log(`   Title: ${res.data.data.title}`);
          console.log(`   Content: ${res.data.data.content}`);
          
          if (res.data.data.version === test.expected) {
            console.log(`   ✅ ถูกต้อง! (${test.expected})`);
          } else {
            console.log(`   ❌ ผิด! ควรเป็น ${test.expected} แต่ได้ ${res.data.data.version}`);
          }
        } else {
          console.log(`❌ API ไม่พบข้อมูล`);
        }
      } catch (e) {
        console.log(`❌ API Error: ${e.message}`);
      }
    }
    
    // 5. แสดง URLs สำหรับทดสอบ
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('5. ทดสอบด้วย Browser');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('1. Customer Thai:');
    console.log('   URL: http://localhost:3003/consent/select-language');
    console.log('   → เลือก "ภาษาไทย"');
    console.log('   ควรเห็น: "นี่คือ Policy ทดสอบสำหรับลูกค้า ภาษาไทย"');
    console.log('   เนื้อหา: "เนื้อหาทดสอบ Customer Thai"');
    
    console.log('\n2. Customer English:');
    console.log('   URL: http://localhost:3003/consent/select-language');
    console.log('   → เลือก "English"');
    console.log('   ควรเห็น: "This is Test Policy for Customer English"');
    console.log('   เนื้อหา: "Test Content Customer English"');
    
    console.log('\n3. Employee:');
    console.log('   URL: http://localhost:3003/consent/employee?lang=th');
    console.log('   ควรเห็น: "นี่คือ Policy ทดสอบสำหรับพนักงาน"');
    console.log('   เนื้อหา: "เนื้อหาทดสอบ Employee"');
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('⚠️ สำคัญมาก!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('1. รีสตาร์ท Backend: Ctrl+C แล้ว node server.js');
    console.log('2. Clear Browser Cache: Ctrl+Shift+Delete');
    console.log('3. Hard Refresh: Ctrl+Shift+R');
    console.log('\nถ้าต้องการเนื้อหาอื่น:');
    console.log('→ สร้างที่ http://localhost:3003/admin/create-policy');
    console.log('→ เนื้อหาที่คุณใส่ = เนื้อหาที่จะแสดง');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

completeResetAndTest();
