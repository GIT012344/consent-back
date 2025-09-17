const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'consent',
  user: 'postgres',
  password: '4321'
});

async function removeNullColumns() {
  const client = await pool.connect();
  
  try {
    console.log('=== REMOVING NULL COLUMNS ===\n');
    
    // ลบ browser column (ทั้งหมด null)
    console.log('Removing browser column...');
    await client.query('ALTER TABLE consent_records DROP COLUMN IF EXISTS browser');
    console.log('✅ Removed browser column');
    
    // ลบ updated_at column (ซ้ำกับ created_date)
    console.log('Removing updated_at column...');
    await client.query('ALTER TABLE consent_records DROP COLUMN IF EXISTS updated_at');
    console.log('✅ Removed updated_at column');
    
    // แสดงโครงสร้างที่เหลือ
    const columns = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'consent_records'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📊 Final structure:');
    columns.rows.forEach(c => console.log(`  - ${c.column_name} (${c.data_type})`));
    
    console.log('\n✅ Cleanup complete!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

removeNullColumns();
