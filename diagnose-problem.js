const { Pool } = require('pg');
const axios = require('axios');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'consent',
  user: 'postgres',
  password: '4321'
});

async function diagnoseProblem() {
  try {
    console.log('🔍 วินิจฉัยปัญหา...\n');
    
    // 1. ตรวจสอบข้อมูลในฐานข้อมูล
    console.log('📋 1. ข้อมูลในฐานข้อมูล:');
    console.log('========================');
    const dbData = await pool.query(`
      SELECT id, version, user_type, language, title, 
             LEFT(content, 100) as content_preview
      FROM policy_versions
      ORDER BY id DESC
    `);
    
    dbData.rows.forEach(p => {
      console.log(`\n[ID:${p.id}] Version:${p.version}`);
      console.log(`  UserType: "${p.user_type}"`);
      console.log(`  Language: ${p.language}`);
      console.log(`  Title: ${p.title}`);
      console.log(`  Content: ${p.content_preview}...`);
    });
    
    // 2. ตรวจสอบ API response
    console.log('\n📋 2. ทดสอบ API /api/simple-policy:');
    console.log('====================================');
    try {
      const apiRes = await axios.get('http://localhost:3000/api/simple-policy');
      if (apiRes.data.success && apiRes.data.data) {
        console.log(`พบ ${apiRes.data.data.length} policies จาก API`);
        apiRes.data.data.forEach(p => {
          console.log(`  [${p.id}] userType:"${p.user_type}" | ${p.language} | ${p.title}`);
        });
      }
    } catch (e) {
      console.log('❌ API Error:', e.message);
    }
    
    // 3. ตรวจสอบปัญหา
    console.log('\n🔍 3. วิเคราะห์ปัญหา:');
    console.log('====================');
    
    // นับ userType
    const userTypeCounts = {};
    dbData.rows.forEach(p => {
      userTypeCounts[p.user_type] = (userTypeCounts[p.user_type] || 0) + 1;
    });
    
    console.log('UserType ที่พบ:');
    Object.entries(userTypeCounts).forEach(([type, count]) => {
      console.log(`  ${type}: ${count} policies`);
    });
    
    // ตรวจสอบว่าทุกอันเป็น customer หรือไม่
    const allCustomer = dbData.rows.every(p => p.user_type === 'customer');
    if (allCustomer) {
      console.log('\n❌ ปัญหา: ทุก policy เป็น customer หมด!');
      console.log('   สาเหตุ: ตอนสร้าง policy ใหม่ userType ไม่ถูกบันทึก');
    }
    
    // 4. แนะนำวิธีแก้
    console.log('\n💡 วิธีแก้ไข:');
    console.log('=============');
    console.log('1. ตรวจสอบหน้า /admin/create-policy ว่าส่ง userType ถูกต้อง');
    console.log('2. ตรวจสอบ backend API ว่ารับและบันทึก userType ถูกต้อง');
    console.log('3. แก้ไข userType ในฐานข้อมูลโดยตรง');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

diagnoseProblem();
