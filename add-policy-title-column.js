const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '4321',
  database: 'consent'
});

async function addPolicyTitleColumn() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 เพิ่มคอลัมน์ policy_title ในตาราง consent_records\n');
    console.log('='.repeat(80));
    
    // 1. ตรวจสอบว่ามีคอลัมน์ policy_title หรือยัง
    const checkColumn = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'consent_records' 
      AND column_name = 'policy_title'
    `);
    
    if (checkColumn.rows.length === 0) {
      // 2. เพิ่มคอลัมน์ policy_title
      console.log('1. เพิ่มคอลัมน์ policy_title...');
      await client.query(`
        ALTER TABLE consent_records 
        ADD COLUMN IF NOT EXISTS policy_title VARCHAR(500)
      `);
      console.log('✅ เพิ่มคอลัมน์ policy_title แล้ว');
    } else {
      console.log('✅ มีคอลัมน์ policy_title อยู่แล้ว');
    }
    
    // 3. อัพเดท policy_title สำหรับ records ที่มีอยู่
    console.log('\n2. อัพเดท policy_title สำหรับ records ที่มีอยู่...');
    
    // Join กับ policy_versions เพื่อดึง title
    const updateQuery = `
      UPDATE consent_records cr
      SET policy_title = pv.title
      FROM policy_versions pv
      WHERE cr.consent_version = pv.version
      AND cr.user_type = pv.user_type
      AND cr.consent_language = pv.language
      AND cr.policy_title IS NULL
      AND pv.is_active = true
    `;
    
    const updateResult = await client.query(updateQuery);
    console.log(`✅ อัพเดท ${updateResult.rowCount} records`);
    
    // 4. แสดงตัวอย่าง records
    console.log('\n3. ตัวอย่าง Consent Records:\n');
    const sample = await client.query(`
      SELECT id, name_surname, user_type, policy_title, consent_version
      FROM consent_records
      WHERE is_active = true
      ORDER BY created_date DESC
      LIMIT 5
    `);
    
    if (sample.rows.length > 0) {
      sample.rows.forEach(r => {
        console.log(`ID ${r.id}: ${r.name_surname}`);
        console.log(`   User Type: ${r.user_type}`);
        console.log(`   Policy Title: ${r.policy_title || 'N/A'}`);
        console.log(`   Version: ${r.consent_version}`);
        console.log('');
      });
    } else {
      console.log('ไม่พบ consent records');
    }
    
    console.log('='.repeat(80));
    console.log('\n✅ เสร็จแล้ว!');
    console.log('\nตอนนี้หน้า Consent Records Management จะแสดง:');
    console.log('- คอลัมน์ "หัวข้อ" ที่แสดง policy title');
    console.log('- Export CSV จะมีคอลัมน์ Title ด้วย');
    console.log('\nConsent ใหม่ที่สร้างจะบันทึก policy title อัตโนมัติ');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

addPolicyTitleColumn();
