const { Pool } = require('pg');
const axios = require('axios');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'consent',
  user: 'postgres',
  password: '4321'
});

async function testApiAndDb() {
  try {
    console.log('🔍 ตรวจสอบระบบทั้งหมด...\n');
    
    // 1. ตรวจสอบข้อมูลในฐานข้อมูล
    console.log('📋 1. ข้อมูลในฐานข้อมูล:');
    console.log('========================');
    const dbResult = await pool.query(`
      SELECT id, user_type, language, title, version
      FROM policy_versions
      ORDER BY id
    `);
    
    if (dbResult.rows.length === 0) {
      console.log('❌ ไม่มีข้อมูลในฐานข้อมูล!');
      console.log('กรุณารัน: node create-all-policies.js');
    } else {
      dbResult.rows.forEach(p => {
        console.log(`[${p.id}] ${p.user_type} | ${p.language} | ${p.title}`);
      });
    }
    
    // 2. ทดสอบ API endpoint
    console.log('\n📋 2. ทดสอบ API /api/simple-policy:');
    console.log('====================================');
    try {
      const apiRes = await axios.get('http://localhost:3000/api/simple-policy');
      if (apiRes.data.success && apiRes.data.data) {
        console.log(`✅ API ส่งกลับ ${apiRes.data.data.length} policies`);
        apiRes.data.data.forEach(p => {
          console.log(`   [${p.id}] ${p.user_type} | ${p.language} | ${p.title}`);
        });
      } else {
        console.log('❌ API ไม่ส่งข้อมูลกลับ');
      }
    } catch (e) {
      console.log('❌ API Error:', e.message);
      console.log('กรุณาตรวจสอบว่า backend ทำงานที่ port 3000');
    }
    
    // 3. ทดสอบการสร้าง Policy ใหม่
    console.log('\n📋 3. ทดสอบการสร้าง Policy:');
    console.log('===========================');
    const testPolicy = {
      tenant_code: 'default',
      version: '2.0.0',
      language: 'th-TH',
      user_type: 'test_user',
      title: 'Test Policy',
      content: '<p>Test content</p>',
      effective_date: new Date().toISOString(),
      is_mandatory: true,
      enforce_mode: 'strict'
    };
    
    try {
      const createRes = await axios.post('http://localhost:3000/api/simple-policy', testPolicy);
      if (createRes.data.success) {
        console.log(`✅ สร้าง Policy สำเร็จ - ID: ${createRes.data.data.id}`);
        console.log(`   UserType: ${createRes.data.data.user_type}`);
        
        // ลบ test policy
        await pool.query('DELETE FROM policy_versions WHERE id = $1', [createRes.data.data.id]);
        console.log('   (ลบ test policy แล้ว)');
      }
    } catch (e) {
      console.log('❌ ไม่สามารถสร้าง Policy:', e.response?.data?.message || e.message);
    }
    
    console.log('\n✅ การตรวจสอบเสร็จสิ้น');
    
    if (dbResult.rows.length === 0) {
      console.log('\n⚠️ กรุณารันคำสั่งนี้เพื่อสร้างข้อมูล:');
      console.log('   node create-all-policies.js');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

testApiAndDb();
