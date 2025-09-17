const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'consent',
  user: 'postgres',
  password: '4321'
});

async function simpleFix() {
  console.log(' ทำความสะอาดตาราง consent_records\n');
  
  try {
    // 1. แสดง columns ปัจจุบัน
    const currentCols = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'consent_records'
      ORDER BY ordinal_position
    `);
    
    console.log(' Columns ปัจจุบัน:');
    currentCols.rows.forEach(col => console.log(`  - ${col.column_name}`));
    
    // 2. ลบ columns ที่ไม่จำเป็น
    console.log('\n กำลังลบ columns ที่ซ้ำซ้อน...');
    
    // uid - ไม่จำเป็น มี consent_id แล้ว
    try {
      await pool.query('ALTER TABLE consent_records DROP COLUMN IF EXISTS uid');
      console.log('  ลบ uid (ใช้ consent_id แทน)');
    } catch (e) {}
    
    // first_name, last_name - ซ้ำกับ name_surname
    try {
      await pool.query('ALTER TABLE consent_records DROP COLUMN IF EXISTS first_name');
      console.log('  ลบ first_name (ใช้ name_surname แทน)');
    } catch (e) {}
    
    try {
      await pool.query('ALTER TABLE consent_records DROP COLUMN IF EXISTS last_name');
      console.log('  ลบ last_name (ใช้ name_surname แทน)');
    } catch (e) {}
    
    // id_number - ซ้ำกับ id_passport
    try {
      await pool.query('ALTER TABLE consent_records DROP COLUMN IF EXISTS id_number');
      console.log('  ลบ id_number (ใช้ id_passport แทน)');
    } catch (e) {}
    
    // id_type - ไม่จำเป็น
    try {
      await pool.query('ALTER TABLE consent_records DROP COLUMN IF EXISTS id_type');
      console.log('  ลบ id_type (ไม่จำเป็น)');
    } catch (e) {}
    
    // snapshot_html - ใหญ่เกินไป
    try {
      await pool.query('ALTER TABLE consent_records DROP COLUMN IF EXISTS snapshot_html');
      console.log('  ลบ snapshot_html (ใหญ่เกินไป)');
    } catch (e) {}
    
    // created_at - ซ้ำกับ created_date
    try {
      await pool.query('ALTER TABLE consent_records DROP COLUMN IF EXISTS created_at');
      console.log('  ลบ created_at (ใช้ created_date แทน)');
    } catch (e) {}
    
    // 3. เพิ่ม columns ที่จำเป็น
    console.log('\n เพิ่ม columns ที่ขาด...');
    
    try {
      await pool.query('ALTER TABLE consent_records ADD COLUMN IF NOT EXISTS consent_id VARCHAR(50)');
      console.log('  เพิ่ม consent_id');
    } catch (e) {}
    
    try {
      await pool.query('ALTER TABLE consent_records ADD COLUMN IF NOT EXISTS consent_type VARCHAR(50) DEFAULT \'customer\'');
      console.log('  เพิ่ม consent_type');
    } catch (e) {}
    
    try {
      await pool.query('ALTER TABLE consent_records ADD COLUMN IF NOT EXISTS policy_title VARCHAR(255)');
      console.log('  เพิ่ม policy_title');
    } catch (e) {}
    
    try {
      await pool.query('ALTER TABLE consent_records ADD COLUMN IF NOT EXISTS user_agent TEXT');
      console.log('  เพิ่ม user_agent');
    } catch (e) {}
    
    try {
      await pool.query('ALTER TABLE consent_records ADD COLUMN IF NOT EXISTS created_time TIME DEFAULT CURRENT_TIME');
      console.log('  เพิ่ม created_time');
    } catch (e) {}
    
    // 4. แสดง columns หลังทำความสะอาด
    const newCols = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'consent_records'
      ORDER BY ordinal_position
    `);
    
    console.log('\n Columns หลังทำความสะอาด:');
    console.log('=====================================');
    newCols.rows.forEach((col, i) => {
      console.log(`${i+1}. ${col.column_name} (${col.data_type})`);
    });
    
    console.log('\n ทำความสะอาดเสร็จสิ้น!');
    console.log('\n สรุป:');
    console.log('- ลบ uid → ใช้ consent_id แทน');
    console.log('- ลบ first_name, last_name → ใช้ name_surname แทน');
    console.log('- ลบ id_number → ใช้ id_passport แทน');
    console.log('- ลบ columns ที่ไม่จำเป็นอื่นๆ');
    console.log('- เพิ่ม columns สำหรับเก็บข้อมูลเพิ่มเติม');
    
    await pool.end();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
  }
}

simpleFix();
