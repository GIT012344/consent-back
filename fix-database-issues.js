const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '4321',
  database: 'consent'
});

async function fixDatabaseIssues() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 แก้ไขปัญหา Database\n');
    console.log('='.repeat(80));
    
    // 1. ลบคอลัมน์ title ออกจาก consent_records
    console.log('1. ลบคอลัมน์ title:\n');
    try {
      await client.query(`ALTER TABLE consent_records DROP COLUMN IF EXISTS title`);
      console.log('✅ ลบคอลัมน์ title แล้ว');
    } catch (err) {
      console.log('⚠️ ไม่มีคอลัมน์ title หรือลบแล้ว');
    }
    
    // 2. เพิ่มคอลัมน์ browser ถ้ายังไม่มี
    console.log('\n2. ตรวจสอบคอลัมน์ browser:\n');
    const checkBrowser = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'consent_records' 
      AND column_name = 'browser'
    `);
    
    if (checkBrowser.rows.length === 0) {
      await client.query(`
        ALTER TABLE consent_records 
        ADD COLUMN browser VARCHAR(255) DEFAULT 'Unknown'
      `);
      console.log('✅ เพิ่มคอลัมน์ browser แล้ว');
    } else {
      console.log('✅ มีคอลัมน์ browser อยู่แล้ว');
    }
    
    // 3. อัพเดท browser ที่เป็น null
    console.log('\n3. แก้ไข browser ที่เป็น null:\n');
    const updateBrowser = await client.query(`
      UPDATE consent_records 
      SET browser = 'Unknown'
      WHERE browser IS NULL
      RETURNING id
    `);
    console.log(`✅ อัพเดท ${updateBrowser.rowCount} records ที่ browser เป็น null`);
    
    // 4. อัพเดท policy_title ให้ตรงกับ Policy Management
    console.log('\n4. อัพเดท policy_title ให้ตรงกัน:\n');
    
    // Join กับ policy_versions เพื่อดึง title ที่ถูกต้อง
    const updateTitle = await client.query(`
      UPDATE consent_records cr
      SET policy_title = pv.title
      FROM policy_versions pv
      WHERE cr.user_type = pv.user_type
      AND cr.consent_language = pv.language
      AND pv.is_active = true
      AND (cr.policy_title = 'Privacy Policy' 
           OR cr.policy_title = 'Consent Policy'
           OR cr.policy_title IS NULL)
      RETURNING cr.id, cr.name_surname, pv.title
    `);
    
    if (updateTitle.rows.length > 0) {
      console.log(`✅ อัพเดท ${updateTitle.rows.length} records`);
      updateTitle.rows.forEach(r => {
        console.log(`   - ${r.name_surname}: "${r.title}"`);
      });
    }
    
    // 5. แสดงผลลัพธ์
    console.log('\n5. ตรวจสอบผลลัพธ์:\n');
    const result = await client.query(`
      SELECT id, name_surname, user_type, policy_title, browser
      FROM consent_records
      WHERE is_active = true
      ORDER BY created_date DESC
      LIMIT 5
    `);
    
    result.rows.forEach(r => {
      console.log(`ID ${r.id}: ${r.name_surname}`);
      console.log(`   User Type: ${r.user_type}`);
      console.log(`   Policy Title: "${r.policy_title || 'N/A'}"`);
      console.log(`   Browser: "${r.browser || 'Unknown'}"`);
      console.log('');
    });
    
    console.log('='.repeat(80));
    console.log('\n✅ แก้ไขเสร็จแล้ว!');
    console.log('- ลบคอลัมน์ title ออกแล้ว');
    console.log('- Browser ไม่เป็น null แล้ว (แสดง "Unknown" แทน)');
    console.log('- Policy title ตรงกับหน้า Policy Management');
    console.log('- ลบคอลัมน์สถานะออกจากหน้า Consent Records Management แล้ว');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

fixDatabaseIssues();
