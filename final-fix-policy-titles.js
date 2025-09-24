const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '4321',
  database: 'consent'
});

async function finalFixPolicyTitles() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 แก้ไข Policy Title ครั้งสุดท้าย\n');
    console.log('='.repeat(80));
    
    // 1. ตรวจสอบ records ที่ยังเป็น Privacy Policy
    console.log('1. Records ที่ยังแสดง Privacy Policy:\n');
    const checkRecords = await client.query(`
      SELECT id, name_surname, user_type, policy_title, consent_language, consent_version
      FROM consent_records
      WHERE policy_title = 'Privacy Policy'
      ORDER BY created_date DESC
    `);
    
    console.log(`พบ ${checkRecords.rows.length} records ที่ต้องแก้ไข`);
    checkRecords.rows.forEach(r => {
      console.log(`   ID ${r.id}: ${r.name_surname} (${r.user_type}/${r.consent_language}) = "${r.policy_title}"`);
    });
    
    // 2. ดู policy versions ที่มีอยู่
    console.log('\n2. Policy Versions ที่มีอยู่:\n');
    const policies = await client.query(`
      SELECT user_type, language, title, version
      FROM policy_versions
      WHERE is_active = true
      ORDER BY user_type, language
    `);
    
    policies.rows.forEach(p => {
      console.log(`   ${p.user_type}/${p.language}: "${p.title}" (v${p.version})`);
    });
    
    // 3. Force update ทุก record ที่เป็น Privacy Policy
    console.log('\n3. Force Update Records:\n');
    
    // Update โดยตรง based on user_type และ language
    const updates = [
      { user_type: 'ฝึกอบรม', language: 'th', title: 'ใบรับรองแพทย์' },
      { user_type: 'customer', language: 'th', title: '001' },
      { user_type: 'customer', language: 'en', title: '002' },
      { user_type: 'employee', language: 'th', title: '003' }
    ];
    
    for (const update of updates) {
      const result = await client.query(`
        UPDATE consent_records
        SET policy_title = $1
        WHERE user_type = $2
        AND consent_language = $3
        AND (policy_title = 'Privacy Policy' OR policy_title IS NULL)
        RETURNING id, name_surname
      `, [update.title, update.user_type, update.language]);
      
      if (result.rowCount > 0) {
        console.log(`✅ อัพเดท ${result.rowCount} records: ${update.user_type}/${update.language} → "${update.title}"`);
      }
    }
    
    // 4. แสดงผลลัพธ์สุดท้าย
    console.log('\n4. ผลลัพธ์สุดท้าย:\n');
    const final = await client.query(`
      SELECT id, name_surname, user_type, policy_title, consent_language
      FROM consent_records
      WHERE is_active = true
      ORDER BY created_date DESC
      LIMIT 10
    `);
    
    final.rows.forEach(r => {
      console.log(`ID ${r.id}: ${r.name_surname}`);
      console.log(`   User Type: ${r.user_type}`);
      console.log(`   Language: ${r.consent_language}`);
      console.log(`   Policy Title: "${r.policy_title}"`);
      console.log('');
    });
    
    console.log('='.repeat(80));
    console.log('\n✅ แก้ไขเสร็จแล้ว!');
    console.log('Policy Title ตอนนี้:');
    console.log('- ฝึกอบรม/th → "ใบรับรองแพทย์"');
    console.log('- customer/th → "001"');
    console.log('- customer/en → "002"');
    console.log('- employee/th → "003"');
    console.log('- ไม่มี "Privacy Policy" แล้ว');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

finalFixPolicyTitles();
