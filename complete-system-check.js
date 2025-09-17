const { Pool } = require('pg');
const axios = require('axios');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'consent',
  user: 'postgres',
  password: '4321'
});

async function completeSystemCheck() {
  try {
    console.log('🔍 ตรวจสอบระบบทั้งหมด...\n');
    
    // 1. ตรวจสอบข้อมูลในฐานข้อมูล
    console.log('=================================');
    console.log('1️⃣ ข้อมูลในฐานข้อมูล');
    console.log('=================================');
    const dbData = await pool.query(`
      SELECT id, version, user_type, language, title, 
             LEFT(content, 100) as content_preview
      FROM policy_versions
      ORDER BY version
    `);
    
    console.log(`พบ ${dbData.rows.length} policies:\n`);
    dbData.rows.forEach(p => {
      console.log(`Version: ${p.version}`);
      console.log(`  ID: ${p.id}`);
      console.log(`  UserType: "${p.user_type}"`);
      console.log(`  Language: ${p.language}`);
      console.log(`  Title: ${p.title}`);
      console.log(`  Content: ${p.content_preview}...`);
      console.log('---');
    });
    
    // 2. ตรวจสอบ API Response
    console.log('\n=================================');
    console.log('2️⃣ ทดสอบ Backend API');
    console.log('=================================');
    
    try {
      const apiRes = await axios.get('http://localhost:3000/api/simple-policy');
      console.log(`\nAPI /api/simple-policy ส่งกลับ ${apiRes.data.data.length} policies:`);
      
      apiRes.data.data.forEach(p => {
        console.log(`\n[${p.id}] Version: ${p.version}`);
        console.log(`  UserType จาก API: "${p.user_type}"`);
        console.log(`  Title: ${p.title}`);
      });
    } catch (e) {
      console.log('❌ API Error:', e.message);
      console.log('⚠️ ตรวจสอบว่า backend ทำงานที่ port 3000');
    }
    
    // 3. วิเคราะห์ปัญหา
    console.log('\n=================================');
    console.log('3️⃣ วิเคราะห์ปัญหา');
    console.log('=================================');
    
    // นับ userType
    const userTypeCounts = {};
    dbData.rows.forEach(p => {
      userTypeCounts[p.user_type] = (userTypeCounts[p.user_type] || 0) + 1;
    });
    
    console.log('\nUserType ที่พบในฐานข้อมูล:');
    Object.entries(userTypeCounts).forEach(([type, count]) => {
      console.log(`  ${type}: ${count} policies`);
    });
    
    // ตรวจสอบว่าทุกอันเป็น customer หรือไม่
    const allCustomer = dbData.rows.every(p => p.user_type === 'customer');
    if (allCustomer && dbData.rows.length > 2) {
      console.log('\n❌ ปัญหา: ทุก policy เป็น customer หมด!');
      console.log('   แม้จะมี title ที่ต่างกัน');
    }
    
    // 4. ลิงก์ที่ควรแสดง
    console.log('\n=================================');
    console.log('4️⃣ ลิงก์ที่ควรแสดง');
    console.log('=================================');
    
    dbData.rows.forEach(p => {
      let expectedLink = '';
      let actualLink = '';
      
      // ลิงก์ที่ควรเป็น
      if (p.title.includes('ลูกค้า') || p.title.includes('Customer')) {
        expectedLink = '/consent/select-language';
      } else if (p.title.includes('พนักงาน')) {
        expectedLink = '/consent/employee?lang=th';
      } else if (p.title.includes('พันธมิตร')) {
        expectedLink = '/consent/partner?lang=th';
      } else {
        expectedLink = `/consent/${p.user_type}?lang=${p.language === 'th-TH' ? 'th' : 'en'}`;
      }
      
      // ลิงก์ที่แสดงจริง (ตาม userType ในฐานข้อมูล)
      if (p.user_type === 'customer') {
        actualLink = '/consent/select-language';
      } else {
        actualLink = `/consent/${p.user_type}?lang=${p.language === 'th-TH' ? 'th' : 'en'}`;
      }
      
      console.log(`\n${p.version}: ${p.title}`);
      console.log(`  ควรเป็น: ${expectedLink}`);
      console.log(`  แสดงจริง: ${actualLink}`);
      
      if (expectedLink !== actualLink) {
        console.log(`  ❌ ไม่ตรงกัน!`);
      } else {
        console.log(`  ✅ ถูกต้อง`);
      }
    });
    
    console.log('\n=================================');
    console.log('📋 สรุป');
    console.log('=================================');
    
    if (allCustomer && dbData.rows.length > 2) {
      console.log('❌ ปัญหาหลัก: userType ในฐานข้อมูลเป็น customer หมด');
      console.log('   ทำให้ลิงก์แสดงเป็น /consent/select-language หมด');
      console.log('\n💡 วิธีแก้: ต้องแก้ไข userType ในฐานข้อมูลให้ถูกต้อง');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

completeSystemCheck();
