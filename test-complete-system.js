const { Pool } = require('pg');
const axios = require('axios');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'consent',
  user: 'postgres',
  password: '4321'
});

async function testCompleteSystem() {
  try {
    console.log('🔍 ตรวจสอบระบบทั้งหมด...\n');
    
    // 1. ตรวจสอบ policies ในฐานข้อมูล
    console.log('📋 Policies ในฐานข้อมูล:');
    console.log('========================');
    const allPolicies = await pool.query(`
      SELECT id, user_type, language, title, version, is_active,
             LEFT(content, 100) as content_preview
      FROM policy_versions 
      ORDER BY user_type, language
    `);
    
    allPolicies.rows.forEach(p => {
      console.log(`[${p.id}] ${p.user_type} - ${p.language} - "${p.title}" v${p.version}`);
      console.log(`     Active: ${p.is_active}`);
      console.log(`     Content: ${p.content_preview.substring(0, 50)}...`);
    });
    
    // 2. ทดสอบ API endpoints
    console.log('\n🌐 ทดสอบ API Endpoints:');
    console.log('========================');
    
    // Test customer Thai
    try {
      const res = await axios.get('http://localhost:3000/api/simple-policy/active?userType=customer&language=th-TH');
      console.log('✅ Customer Thai:', res.data.data ? res.data.data.title : 'NOT FOUND');
    } catch (e) {
      console.log('❌ Customer Thai: ERROR', e.message);
    }
    
    // Test customer English
    try {
      const res = await axios.get('http://localhost:3000/api/simple-policy/active?userType=customer&language=en-US');
      console.log('✅ Customer English:', res.data.data ? res.data.data.title : 'NOT FOUND');
    } catch (e) {
      console.log('❌ Customer English: ERROR', e.message);
    }
    
    // Test employee
    try {
      const res = await axios.get('http://localhost:3000/api/simple-policy/active?userType=employee&language=th-TH');
      console.log('✅ Employee Thai:', res.data.data ? res.data.data.title : 'NOT FOUND');
    } catch (e) {
      console.log('❌ Employee Thai: ERROR', e.message);
    }
    
    // 3. ตรวจสอบการบันทึก userType
    console.log('\n🔧 ทดสอบการบันทึก Policy ใหม่:');
    console.log('================================');
    
    // สร้าง test policy
    const testPolicy = {
      version: '2.0.0',
      title: 'Test Partner Policy',
      content: '<p>Test content for partner</p>',
      language: 'th-TH',
      user_type: 'partner',  // ต้องเป็น partner ไม่ใช่ customer
      effective_date: new Date().toISOString(),
      expiry_date: null
    };
    
    try {
      const createRes = await axios.post('http://localhost:3000/api/simple-policy', testPolicy);
      if (createRes.data.success) {
        console.log('✅ สร้าง Policy สำเร็จ');
        
        // ตรวจสอบว่าบันทึก userType ถูกต้อง
        const checkRes = await pool.query(
          'SELECT user_type FROM policy_versions WHERE id = $1',
          [createRes.data.data.id]
        );
        
        if (checkRes.rows[0].user_type === 'partner') {
          console.log('✅ UserType บันทึกถูกต้อง: partner');
        } else {
          console.log(`❌ UserType ผิด! บันทึกเป็น: ${checkRes.rows[0].user_type}`);
        }
        
        // ลบ test policy
        await pool.query('DELETE FROM policy_versions WHERE id = $1', [createRes.data.data.id]);
      }
    } catch (e) {
      console.log('❌ ไม่สามารถสร้าง Policy:', e.message);
    }
    
    // 4. ตรวจสอบ content formatting
    console.log('\n📝 ตรวจสอบ Content Formatting:');
    console.log('================================');
    
    const testContent = `<p>ย่อหน้าแรก</p>
<p>ย่อหน้าที่สอง</p>
<ul>
<li>รายการที่ 1</li>
<li>รายการที่ 2</li>
</ul>`;
    
    console.log('Content ที่ควรแสดง:');
    console.log('- ย่อหน้าแรก');
    console.log('- ย่อหน้าที่สอง (เว้นบรรทัด)');
    console.log('- • รายการที่ 1');
    console.log('- • รายการที่ 2');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

testCompleteSystem();
