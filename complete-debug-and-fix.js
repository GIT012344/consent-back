const { Pool } = require('pg');
const axios = require('axios');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '4321',
  database: 'consent'
});

async function completeDebugAndFix() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 ตรวจสอบและแก้ไขทั้งระบบ\n');
    console.log('='.repeat(80));
    
    // 1. ตรวจสอบฐานข้อมูล
    console.log('1️⃣ DATABASE CHECK:\n');
    
    const dbCheck = await client.query(`
      SELECT id, user_type, language, title, 
             LEFT(content, 200) as content_preview,
             is_active, created_at, updated_at
      FROM policy_versions
      WHERE is_active = true
      ORDER BY created_at DESC
    `);
    
    console.log(`พบ ${dbCheck.rows.length} policies ในฐานข้อมูล:`);
    
    if (dbCheck.rows.length === 0) {
      console.log('❌ ไม่มี policy เลย - กำลังสร้าง...\n');
      
      // สร้าง policy ใหม่
      await client.query(`
        INSERT INTO policy_versions (
          title, user_type, language, version, content, is_active
        ) VALUES (
          '001',
          'customer',
          'th',
          '1.0.0',
          '<h1>นโยบายความเป็นส่วนตัว</h1>
<p>นโยบายเลือกข้อหาม</p>
<p>ผลิตภัณฑ์นี้ความเอาผา</p>
<p>อำพลสนุยมความยอมพใจ</p>
<p>สร้างเมื่อ: ${new Date().toLocaleString('th-TH')}</p>',
          true
        )
      `);
      console.log('✅ สร้าง policy สำหรับ customer/th แล้ว');
    } else {
      dbCheck.rows.forEach(p => {
        console.log(`\n${p.user_type}/${p.language}: "${p.title}" (ID: ${p.id})`);
        console.log(`Active: ${p.is_active}`);
        console.log(`Content: ${p.content_preview}...`);
      });
    }
    
    // 2. ทดสอบ API endpoint
    console.log('\n2️⃣ API CHECK:\n');
    
    const apiUrl = 'http://localhost:3000/api/simple-policy/active?userType=customer&language=th';
    console.log(`Testing: ${apiUrl}`);
    
    try {
      const response = await axios.get(apiUrl);
      console.log(`Status: ${response.status}`);
      
      if (response.data.success && response.data.data) {
        console.log('✅ API พบ Policy:');
        console.log(`  Title: "${response.data.data.title}"`);
        console.log(`  Content: ${response.data.data.content?.substring(0, 100)}...`);
      } else {
        console.log('❌ API ไม่พบ Policy');
        console.log(`  Message: ${response.data.message}`);
      }
    } catch (err) {
      console.log('❌ API Error:', err.message);
      console.log('⚠️ Backend อาจไม่ทำงาน');
    }
    
    // 3. ตรวจสอบ Frontend code
    console.log('\n3️⃣ FRONTEND CHECK:\n');
    console.log('Frontend (ConsentFlowPage.js) ควร:');
    console.log('- เรียก API: /api/simple-policy/active');
    console.log('- ส่ง params: userType=customer&language=th');
    console.log('- รับ response.data.data.content');
    console.log('- แสดงผ่าน dangerouslySetInnerHTML');
    
    // 4. แก้ไขปัญหา
    console.log('\n4️⃣ FIXING ISSUES:\n');
    
    // ตรวจสอบว่ามี policy สำหรับ customer/th หรือไม่
    const checkPolicy = await client.query(`
      SELECT COUNT(*) as count 
      FROM policy_versions 
      WHERE user_type = 'customer' AND language = 'th' AND is_active = true
    `);
    
    if (checkPolicy.rows[0].count === '0') {
      console.log('❌ ไม่พบ policy สำหรับ customer/th - กำลังสร้าง...');
      
      await client.query(`
        INSERT INTO policy_versions (
          title, user_type, language, version, content, is_active
        ) VALUES (
          '001',
          'customer',
          'th',
          '1.0.0',
          '<h1>นโยบายความเป็นส่วนตัว</h1><p>เนื้อหาที่ Admin สร้าง</p>',
          true
        )
      `);
      console.log('✅ สร้าง policy แล้ว');
    } else {
      console.log('✅ มี policy สำหรับ customer/th แล้ว');
    }
    
    // 5. สรุปผล
    console.log('\n' + '='.repeat(80));
    console.log('\n✅ การแก้ไข:\n');
    
    const final = await client.query(`
      SELECT user_type, language, title, is_active
      FROM policy_versions
      WHERE is_active = true
      ORDER BY user_type, language
    `);
    
    console.log('Policies ที่พร้อมใช้:');
    final.rows.forEach(p => {
      console.log(`• ${p.user_type}/${p.language}: "${p.title}" (Active: ${p.is_active})`);
    });
    
    console.log('\n📋 ขั้นตอนต่อไป:');
    console.log('1. ตรวจสอบว่า backend ทำงาน: npm run dev');
    console.log('2. ไปที่: http://localhost:5000/consent/customer?lang=th');
    console.log('3. กด Ctrl+F5 เพื่อ clear cache');
    console.log('4. ดู Console (F12) ถ้ามี error');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

completeDebugAndFix();
