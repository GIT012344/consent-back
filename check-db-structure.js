const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'consent',
  user: 'postgres',
  password: '4321'
});

async function checkStructure() {
  try {
    console.log('=== DATABASE STRUCTURE CHECK ===\n');
    
    // 1. ดู tables ทั้งหมด
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('📋 All tables in database:');
    tables.rows.forEach(t => console.log('  -', t.table_name));
    
    // 2. ดู columns ใน consent_records
    const columns = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'consent_records'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📊 Columns in consent_records:');
    columns.rows.forEach(c => {
      console.log(`  - ${c.column_name} (${c.data_type}) ${c.is_nullable === 'NO' ? 'NOT NULL' : ''}`);
    });
    
    // 3. ดูข้อมูลตัวอย่าง
    const sample = await pool.query('SELECT * FROM consent_records LIMIT 1');
    if (sample.rows.length > 0) {
      console.log('\n📝 Sample record:');
      Object.keys(sample.rows[0]).forEach(key => {
        if (sample.rows[0][key]) {
          console.log(`  ${key}: ${sample.rows[0][key]}`);
        }
      });
    }
    
    // 4. นับจำนวน records
    const count = await pool.query('SELECT COUNT(*) FROM consent_records');
    console.log(`\n📈 Total records: ${count.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkStructure();
