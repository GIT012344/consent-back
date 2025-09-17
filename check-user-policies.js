const { Pool } = require('pg');
const axios = require('axios');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'consent',
  user: 'postgres',
  password: '4321'
});

async function checkUserPolicies() {
  try {
    console.log('🔍 ตรวจสอบ Policies ที่ USER สร้าง...\n');
    
    // 1. ดูทั้งหมดที่มีในฐานข้อมูล
    console.log('📋 Policies ทั้งหมดในฐานข้อมูล:');
    console.log('=====================================');
    const allPolicies = await pool.query(`
      SELECT id, user_type, language, title, version, is_active,
             content
      FROM policy_versions
      ORDER BY id DESC
    `);
    
    if (allPolicies.rows.length === 0) {
      console.log('❌ ไม่มี policies ในฐานข้อมูล!');
      console.log('กรุณาสร้าง policy ผ่านหน้า /admin/create-policy');
    } else {
      allPolicies.rows.forEach(p => {
        console.log(`\n[ID: ${p.id}]`);
        console.log(`UserType: ${p.user_type}`);
        console.log(`Language: ${p.language}`);
        console.log(`Title: ${p.title}`);
        console.log(`Active: ${p.is_active}`);
        console.log(`Content (first 200 chars): ${p.content.substring(0, 200)}...`);
        console.log('---');
      });
    }
    
    // 2. ทดสอบ API สำหรับ customer Thai
    console.log('\n🌐 ทดสอบ API Customer Thai:');
    console.log('============================');
    try {
      const res = await axios.get(
        'http://localhost:3000/api/simple-policy/active?userType=customer&language=th-TH'
      );
      if (res.data.success && res.data.data) {
        console.log('✅ พบ Policy:');
        console.log(`   ID: ${res.data.data.id}`);
        console.log(`   Title: ${res.data.data.title}`);
        console.log(`   Content: ${res.data.data.content.substring(0, 200)}...`);
      } else {
        console.log('❌ ไม่พบ policy');
      }
    } catch (e) {
      console.log('❌ API Error:', e.message);
    }
    
    // 3. ทดสอบ API สำหรับ customer English
    console.log('\n🌐 ทดสอบ API Customer English:');
    console.log('===============================');
    try {
      const res = await axios.get(
        'http://localhost:3000/api/simple-policy/active?userType=customer&language=en-US'
      );
      if (res.data.success && res.data.data) {
        console.log('✅ พบ Policy:');
        console.log(`   ID: ${res.data.data.id}`);
        console.log(`   Title: ${res.data.data.title}`);
        console.log(`   Content: ${res.data.data.content.substring(0, 200)}...`);
      } else {
        console.log('❌ ไม่พบ policy');
      }
    } catch (e) {
      console.log('❌ API Error:', e.message);
    }
    
    // 4. สรุป
    console.log('\n📊 สรุป:');
    console.log('========');
    const customerPolicies = allPolicies.rows.filter(p => p.user_type === 'customer');
    console.log(`Customer policies: ${customerPolicies.length} รายการ`);
    customerPolicies.forEach(p => {
      console.log(`   - ${p.language}: "${p.title}"`);
    });
    
    const otherPolicies = allPolicies.rows.filter(p => p.user_type !== 'customer');
    console.log(`\nOther userType policies: ${otherPolicies.length} รายการ`);
    otherPolicies.forEach(p => {
      console.log(`   - ${p.user_type} (${p.language}): "${p.title}"`);
    });
    
    console.log('\n⚠️ หากเนื้อหาไม่ตรง:');
    console.log('1. ลบ policies เก่าทั้งหมด');
    console.log('2. สร้างใหม่ผ่าน /admin/create-policy');
    console.log('3. ตรวจสอบว่า userType และ language ถูกต้อง');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkUserPolicies();
