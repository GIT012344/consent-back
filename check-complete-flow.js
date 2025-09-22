const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '4321',
  database: 'consent'
});

async function checkCompleteFlow() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 ตรวจสอบทั้งระบบ - จากการสร้างจนถึงการแสดงผล\n');
    console.log('='.repeat(80));
    
    // 1. ดู policies ทั้งหมดในฐานข้อมูล
    console.log('1. Policies ในฐานข้อมูล:\n');
    const policies = await client.query(`
      SELECT id, user_type, language, title, 
             created_at, updated_at
      FROM policy_versions
      WHERE is_active = true
      ORDER BY created_at DESC
    `);
    
    policies.rows.forEach(p => {
      console.log(`ID ${p.id}: ${p.user_type}/${p.language} = "${p.title}"`);
      console.log(`   Created: ${new Date(p.created_at).toLocaleString('th-TH')}`);
      
      // ตรวจสอบว่า language ถูกต้องหรือไม่
      if (p.language !== 'th' && p.language !== 'en') {
        console.log(`   ⚠️ Language format ผิด! ควรเป็น 'th' หรือ 'en' แต่เป็น '${p.language}'`);
      }
    });
    
    console.log('\n' + '='.repeat(80));
    console.log('\n2. ปัญหาที่พบ:\n');
    console.log('Frontend (CreateSinglePolicy.js):');
    console.log('- Form มี language: "th-TH" หรือ "en-US"');
    console.log('- แปลงเป็น "th" หรือ "en" ก่อนส่ง');
    console.log('\nBackend (simple-policy.js):');
    console.log('- รับ language และบันทึกลงฐานข้อมูล');
    console.log('- ต้องตรวจสอบว่าได้รับ format ที่ถูกต้อง');
    
    console.log('\n3. วิธีแก้ไข:');
    console.log('- ตรวจสอบการแปลง language ใน CreateSinglePolicy.js');
    console.log('- ตรวจสอบการรับค่าใน backend');
    console.log('- ตรวจสอบการบันทึกลงฐานข้อมูล');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

checkCompleteFlow();
