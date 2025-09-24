const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '4321',
  database: 'consent'
});

async function checkPolicyTitleData() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 ตรวจสอบข้อมูล policy_title ในฐานข้อมูล\n');
    console.log('='.repeat(80));
    
    // 1. ตรวจสอบโครงสร้างตาราง consent_records
    console.log('1. โครงสร้างตาราง consent_records:\n');
    const columns = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'consent_records'
      AND column_name IN ('policy_title', 'user_type', 'consent_language', 'name_surname')
      ORDER BY ordinal_position
    `);
    
    columns.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type}`);
    });
    
    // 2. ดูข้อมูล consent_records
    console.log('\n2. ข้อมูลใน consent_records:\n');
    const records = await client.query(`
      SELECT id, name_surname, user_type, consent_language, policy_title
      FROM consent_records
      WHERE is_active = true
      ORDER BY created_date DESC
      LIMIT 10
    `);
    
    records.rows.forEach(r => {
      console.log(`ID ${r.id}: ${r.name_surname}`);
      console.log(`   User Type: "${r.user_type}"`);
      console.log(`   Language: "${r.consent_language}"`);
      console.log(`   Policy Title: "${r.policy_title}"`);
      console.log('');
    });
    
    // 3. ดูข้อมูล policy_versions
    console.log('3. ข้อมูลใน policy_versions:\n');
    const policies = await client.query(`
      SELECT id, user_type, language, title, version
      FROM policy_versions
      WHERE is_active = true
      ORDER BY created_at DESC
    `);
    
    policies.rows.forEach(p => {
      console.log(`Policy ID ${p.id}:`);
      console.log(`   User Type: "${p.user_type}"`);
      console.log(`   Language: "${p.language}"`);
      console.log(`   Title: "${p.title}"`);
      console.log(`   Version: "${p.version}"`);
      console.log('');
    });
    
    // 4. ตรวจสอบ API endpoint
    console.log('4. ตรวจสอบ API Response:\n');
    const apiCheck = await client.query(`
      SELECT 
        cr.id,
        cr.name_surname as name,
        cr.id_passport,
        cr.user_type,
        cr.consent_language,
        cr.consent_version,
        cr.policy_title,
        cr.created_date as created_at,
        cr.is_active
      FROM consent_records cr
      WHERE cr.is_active = true
      ORDER BY cr.created_date DESC
      LIMIT 1
    `);
    
    if (apiCheck.rows.length > 0) {
      console.log('API should return:');
      console.log(JSON.stringify(apiCheck.rows[0], null, 2));
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('\n📊 สรุป:');
    console.log('- ฟิลด์ policy_title มีอยู่ในตาราง consent_records');
    console.log('- ข้อมูล policy_title ควรมาจาก policy_versions.title');
    console.log('- API ต้องส่ง policy_title กลับมาให้ frontend');
    console.log('- Frontend ต้องแสดง record.policy_title (ไม่ใช่ hardcode)');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

checkPolicyTitleData();
