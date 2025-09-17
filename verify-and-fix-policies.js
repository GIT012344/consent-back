const { Pool } = require('pg');
const axios = require('axios');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'consent',
  user: 'postgres',
  password: '4321'
});

async function verifyAndFixPolicies() {
  try {
    console.log('🔍 ตรวจสอบและแก้ไขปัญหา Policy...\n');
    
    // 1. ตรวจสอบว่ามี policies ในฐานข้อมูลหรือไม่
    console.log('1. ตรวจสอบฐานข้อมูล:');
    const dbCheck = await pool.query('SELECT * FROM policy_versions WHERE is_active = true');
    
    if (dbCheck.rows.length === 0) {
      console.log('❌ ไม่มี active policies ในฐานข้อมูล!\n');
      console.log('🔧 สร้าง policies ใหม่...\n');
      
      // สร้าง policies ใหม่
      const policies = [
        {
          version: 'v1-customer-th',
          title: 'นโยบายความเป็นส่วนตัว - ลูกค้า',
          content: '<h2>นโยบายความเป็นส่วนตัวสำหรับลูกค้า</h2><p>เนื้อหาสำหรับลูกค้า ภาษาไทย</p>',
          language: 'th-TH',
          user_type: 'customer'
        },
        {
          version: 'v1-customer-en',
          title: 'Privacy Policy - Customer',
          content: '<h2>Privacy Policy for Customers</h2><p>Content for customers in English</p>',
          language: 'en-US',
          user_type: 'customer'
        },
        {
          version: 'v1-employee-th',
          title: 'นโยบายพนักงาน',
          content: '<h2>นโยบายสำหรับพนักงาน</h2><p>เนื้อหาสำหรับพนักงาน</p>',
          language: 'th-TH',
          user_type: 'employee'
        },
        {
          version: 'v1-partner-th',
          title: 'นโยบายพันธมิตร',
          content: '<h2>นโยบายสำหรับพันธมิตร</h2><p>เนื้อหาสำหรับพันธมิตร</p>',
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
    } else {
      console.log(`✅ พบ ${dbCheck.rows.length} active policies:`);
      dbCheck.rows.forEach(p => {
        console.log(`   - [${p.version}] ${p.user_type} (${p.language}): ${p.title}`);
      });
    }
    
    // 2. ทดสอบ API endpoint
    console.log('\n2. ทดสอบ API /api/simple-policy/active:');
    
    const tests = [
      { userType: 'customer', language: 'th-TH' },
      { userType: 'customer', language: 'en-US' },
      { userType: 'employee', language: 'th-TH' }
    ];
    
    for (const test of tests) {
      try {
        const url = `http://localhost:3000/api/simple-policy/active?userType=${test.userType}&language=${test.language}`;
        console.log(`\nTesting: ${test.userType} - ${test.language}`);
        
        const response = await axios.get(url);
        
        if (response.data.success && response.data.data) {
          console.log(`✅ Success: ${response.data.data.title}`);
        } else {
          console.log(`❌ Failed: ${response.data.message || 'No data'}`);
        }
      } catch (error) {
        console.log(`❌ Error: ${error.message}`);
      }
    }
    
    // 3. ตรวจสอบ ConsentFlowPage
    console.log('\n3. ตรวจสอบ Frontend (ConsentFlowPage.js):');
    console.log('   - Line 170: เรียก API ที่ /api/simple-policy/active');
    console.log('   - Line 173: ตรวจสอบ response.data.success และ response.data.data');
    console.log('   - Line 183: ถ้าไม่มีข้อมูลจะ throw Error');
    
    // 4. วิธีแก้ไข
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📌 วิธีแก้ไข:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('1. รีสตาร์ท Backend:');
    console.log('   cd c:\\Users\\jchayapol\\consent-back');
    console.log('   Ctrl+C (หยุด backend)');
    console.log('   node server.js (เริ่มใหม่)\n');
    
    console.log('2. Clear Browser Cache:');
    console.log('   Ctrl+Shift+Delete → Clear Cache\n');
    
    console.log('3. ทดสอบใหม่:');
    console.log('   http://localhost:3003/consent/select-language');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

verifyAndFixPolicies();
