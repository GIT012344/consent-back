const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '4321',
  database: 'consent'
});

async function forceFixPolicyTitles() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 แก้ไข Privacy Policy ให้เป็น Title ที่ถูกต้อง\n');
    console.log('='.repeat(80));
    
    // 1. ดู records ที่ยังเป็น Privacy Policy
    console.log('1. Records ที่ยังแสดง Privacy Policy:\n');
    const wrongTitles = await client.query(`
      SELECT id, name_surname, user_type, policy_title, consent_language
      FROM consent_records
      WHERE policy_title IN ('Privacy Policy', 'Consent Policy', 'N/A')
         OR policy_title IS NULL
      ORDER BY created_date DESC
    `);
    
    console.log(`พบ ${wrongTitles.rows.length} records ที่ต้องแก้ไข`);
    wrongTitles.rows.forEach(r => {
      console.log(`   ID ${r.id}: ${r.name_surname} (${r.user_type}/${r.consent_language}) = "${r.policy_title}"`);
    });
    
    // 2. ดู policy versions ที่มีอยู่
    console.log('\n2. Policy Versions ที่มีอยู่:\n');
    const policies = await client.query(`
      SELECT DISTINCT user_type, language, title
      FROM policy_versions
      WHERE is_active = true
      ORDER BY user_type, language
    `);
    
    policies.rows.forEach(p => {
      console.log(`   ${p.user_type}/${p.language}: "${p.title}"`);
    });
    
    // 3. Force update ทุก record
    console.log('\n3. Force Update ทุก Record:\n');
    
    // Update โดยใช้ subquery
    const updateAll = await client.query(`
      UPDATE consent_records cr
      SET policy_title = COALESCE(
        (SELECT pv.title 
         FROM policy_versions pv
         WHERE pv.user_type = cr.user_type
         AND pv.language = cr.consent_language
         AND pv.is_active = true
         ORDER BY pv.created_at DESC
         LIMIT 1),
        (SELECT pv.title 
         FROM policy_versions pv
         WHERE pv.user_type = cr.user_type
         AND pv.is_active = true
         ORDER BY pv.created_at DESC
         LIMIT 1),
        cr.policy_title
      )
      WHERE policy_title IN ('Privacy Policy', 'Consent Policy', 'N/A')
         OR policy_title IS NULL
      RETURNING id, name_surname, policy_title
    `);
    
    console.log(`✅ อัพเดท ${updateAll.rowCount} records`);
    if (updateAll.rows.length > 0) {
      updateAll.rows.forEach(r => {
        console.log(`   - ${r.name_surname}: "${r.policy_title}"`);
      });
    }
    
    // 4. สำหรับ record ที่เป็น "ฝึกอบรม" ให้ใช้ "ใบรับรองแพทย์"
    console.log('\n4. Update พิเศษสำหรับ ฝึกอบรม:\n');
    const updateIntern = await client.query(`
      UPDATE consent_records
      SET policy_title = 'ใบรับรองแพทย์'
      WHERE user_type = 'ฝึกอบรม'
      AND consent_language = 'th'
      RETURNING id, name_surname
    `);
    
    if (updateIntern.rowCount > 0) {
      console.log(`✅ อัพเดท ${updateIntern.rowCount} records ของฝึกอบรม`);
    }
    
    // 5. แสดงผลลัพธ์สุดท้าย
    console.log('\n5. ผลลัพธ์สุดท้าย:\n');
    const final = await client.query(`
      SELECT id, name_surname, user_type, policy_title
      FROM consent_records
      WHERE is_active = true
      ORDER BY created_date DESC
      LIMIT 10
    `);
    
    final.rows.forEach(r => {
      console.log(`ID ${r.id}: ${r.name_surname}`);
      console.log(`   User Type: ${r.user_type}`);
      console.log(`   Policy Title: "${r.policy_title}"`);
      console.log('');
    });
    
    console.log('='.repeat(80));
    console.log('\n✅ แก้ไขเสร็จแล้ว!');
    console.log('Policy Title ควรแสดงตาม Policy Management:');
    console.log('- ฝึกอบรม → "ใบรับรองแพทย์"');
    console.log('- customer → "001" หรือ "002"');
    console.log('- ไม่แสดง "Privacy Policy" แล้ว');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

forceFixPolicyTitles();
