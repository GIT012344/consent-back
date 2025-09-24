const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '4321',
  database: 'consent'
});

async function fixPolicyTitleSaving() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 ตรวจสอบและแก้ไขการบันทึก Policy Title\n');
    console.log('='.repeat(80));
    
    // 1. ดู consent records ล่าสุด
    console.log('1. Consent Records ล่าสุด:\n');
    const records = await client.query(`
      SELECT cr.id, cr.name_surname, cr.user_type, cr.policy_title, 
             cr.consent_version, cr.consent_language, cr.created_date
      FROM consent_records cr
      WHERE cr.is_active = true
      ORDER BY cr.created_date DESC
      LIMIT 5
    `);
    
    records.rows.forEach(r => {
      console.log(`ID ${r.id}: ${r.name_surname}`);
      console.log(`   User Type: ${r.user_type}`);
      console.log(`   Policy Title: "${r.policy_title || 'N/A'}"`);
      console.log(`   Version: ${r.consent_version}`);
      console.log(`   Language: ${r.consent_language}`);
      console.log('');
    });
    
    // 2. ดู policy versions ที่มี
    console.log('2. Policy Versions ที่มีอยู่:\n');
    const policies = await client.query(`
      SELECT pv.id, pv.user_type, pv.language, pv.title, pv.version
      FROM policy_versions pv
      WHERE pv.is_active = true
      ORDER BY pv.created_at DESC
      LIMIT 10
    `);
    
    policies.rows.forEach(p => {
      console.log(`Policy ID ${p.id}: ${p.user_type}/${p.language}`);
      console.log(`   Title: "${p.title}"`);
      console.log(`   Version: ${p.version}`);
      console.log('');
    });
    
    // 3. อัพเดท policy_title สำหรับ records ที่ยังไม่มี
    console.log('3. อัพเดท Policy Title ที่หายไป:\n');
    
    // Method 1: Match by version, user_type, and language
    const update1 = await client.query(`
      UPDATE consent_records cr
      SET policy_title = pv.title
      FROM policy_versions pv
      WHERE cr.consent_version = pv.version
      AND cr.user_type = pv.user_type
      AND cr.consent_language = pv.language
      AND (cr.policy_title IS NULL OR cr.policy_title = 'N/A' OR cr.policy_title = '')
      AND pv.is_active = true
      RETURNING cr.id, cr.name_surname, pv.title
    `);
    
    if (update1.rows.length > 0) {
      console.log(`✅ อัพเดทด้วย exact match: ${update1.rows.length} records`);
      update1.rows.forEach(r => {
        console.log(`   - ${r.name_surname}: "${r.title}"`);
      });
    }
    
    // Method 2: Match by user_type and language only (for records without matching version)
    const update2 = await client.query(`
      UPDATE consent_records cr
      SET policy_title = (
        SELECT pv.title 
        FROM policy_versions pv
        WHERE pv.user_type = cr.user_type
        AND pv.language = cr.consent_language
        AND pv.is_active = true
        ORDER BY pv.created_at DESC
        LIMIT 1
      )
      WHERE (cr.policy_title IS NULL OR cr.policy_title = 'N/A' OR cr.policy_title = '')
      RETURNING cr.id, cr.name_surname, cr.policy_title
    `);
    
    if (update2.rows.length > 0) {
      console.log(`✅ อัพเดทด้วย user_type/language: ${update2.rows.length} records`);
      update2.rows.forEach(r => {
        console.log(`   - ${r.name_surname}: "${r.policy_title}"`);
      });
    }
    
    // 4. แสดงผลลัพธ์หลังอัพเดท
    console.log('\n4. ผลลัพธ์หลังอัพเดท:\n');
    const finalCheck = await client.query(`
      SELECT cr.id, cr.name_surname, cr.user_type, cr.policy_title
      FROM consent_records cr
      WHERE cr.is_active = true
      ORDER BY cr.created_date DESC
      LIMIT 5
    `);
    
    finalCheck.rows.forEach(r => {
      console.log(`ID ${r.id}: ${r.name_surname}`);
      console.log(`   User Type: ${r.user_type}`);
      console.log(`   Policy Title: "${r.policy_title || 'N/A'}"`);
      console.log('');
    });
    
    console.log('='.repeat(80));
    console.log('\n✅ เสร็จแล้ว!');
    console.log('\nPolicy Title จะแสดงใน Consent Records Management:');
    console.log('- จากภาพ: "ใบรับรองแพทย์" สำหรับ user type "ฝึกงาน"');
    console.log('- Title มาจาก policy_versions table');
    console.log('- Consent ใหม่จะบันทึก title อัตโนมัติ');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

fixPolicyTitleSaving();
