const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '4321',
  database: 'consent'
});

async function checkActualContent() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 ตรวจสอบเนื้อหาจริงในฐานข้อมูล\n');
    console.log('='.repeat(80));
    
    // ดึงข้อมูลทั้งหมดของแต่ละ policy
    const policies = await client.query(`
      SELECT id, user_type, language, title, content, 
             version, is_active, created_at, updated_at
      FROM policy_versions
      WHERE is_active = true
      ORDER BY user_type, language
    `);
    
    if (policies.rows.length === 0) {
      console.log('❌ ไม่พบ policy ในฐานข้อมูล!');
      return;
    }
    
    console.log(`พบ ${policies.rows.length} policies:\n`);
    
    policies.rows.forEach((p, index) => {
      console.log(`${index + 1}. Policy ID: ${p.id}`);
      console.log(`   User Type: ${p.user_type}`);
      console.log(`   Language: ${p.language}`);
      console.log(`   Title: "${p.title}"`);
      console.log(`   Version: ${p.version}`);
      console.log(`   Active: ${p.is_active ? '✅' : '❌'}`);
      console.log(`   Created: ${new Date(p.created_at).toLocaleString('th-TH')}`);
      console.log(`   Updated: ${p.updated_at ? new Date(p.updated_at).toLocaleString('th-TH') : 'Never'}`);
      console.log(`   Content (Full):`);
      console.log('   ' + '-'.repeat(60));
      console.log(`   ${p.content}`);
      console.log('   ' + '-'.repeat(60));
      console.log('');
    });
    
    console.log('='.repeat(80));
    console.log('\n📋 สรุป:');
    console.log('เนื้อหาด้านบนคือเนื้อหาจริงที่อยู่ในฐานข้อมูล');
    console.log('ถ้าไม่ใช่เนื้อหาที่คุณเขียน แสดงว่า:');
    console.log('1. อาจมีการ override จากที่อื่น');
    console.log('2. การบันทึกอาจไม่สำเร็จ');
    console.log('3. อาจมี bug ในการแสดงผล');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

checkActualContent();
