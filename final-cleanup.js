const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'consent',
  user: 'postgres',
  password: '4321'
});

async function finalCleanup() {
  const client = await pool.connect();
  
  try {
    console.log('=== FINAL DATABASE CLEANUP ===\n');
    
    // 1. ตรวจสอบว่ามี columns พวกนี้อยู่หรือไม่
    const checkColumns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'consent_records'
      AND column_name IN ('browser', 'updated_at')
    `);
    
    if (checkColumns.rows.length > 0) {
      console.log('Found columns to remove:');
      checkColumns.rows.forEach(c => console.log(`  - ${c.column_name}`));
      
      // ลบ browser ถ้ามี
      try {
        await client.query('ALTER TABLE consent_records DROP COLUMN IF EXISTS browser CASCADE');
        console.log('✅ Removed browser column');
      } catch (err) {
        console.log('⚠️ Could not remove browser:', err.message);
      }
      
      // ลบ updated_at ถ้ามี
      try {
        await client.query('ALTER TABLE consent_records DROP COLUMN IF EXISTS updated_at CASCADE');
        console.log('✅ Removed updated_at column');
      } catch (err) {
        console.log('⚠️ Could not remove updated_at:', err.message);
      }
    } else {
      console.log('✅ No duplicate columns found - already clean!');
    }
    
    // 2. แสดงโครงสร้างสุดท้าย
    const finalColumns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'consent_records'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📊 FINAL consent_records structure:');
    console.log('----------------------------------------');
    finalColumns.rows.forEach(c => {
      const nullable = c.is_nullable === 'YES' ? '' : ' NOT NULL';
      console.log(`  ${c.column_name.padEnd(20)} ${c.data_type}${nullable}`);
    });
    
    // 3. ตรวจสอบข้อมูล
    const count = await client.query('SELECT COUNT(*) FROM consent_records');
    console.log(`\n📈 Total records: ${count.rows[0].count}`);
    
    // 4. ดูตัวอย่างข้อมูล
    const sample = await client.query(`
      SELECT id, name_surname, created_date, user_type 
      FROM consent_records 
      LIMIT 3
    `);
    
    if (sample.rows.length > 0) {
      console.log('\n📝 Sample data:');
      sample.rows.forEach(r => {
        console.log(`  ID ${r.id}: ${r.name_surname} (${r.user_type})`);
      });
    }
    
    console.log('\n✅ Database is now clean and optimized!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

finalCleanup();
