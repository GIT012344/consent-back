const { Client } = require('pg');

async function directTest() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'consent',
    user: 'postgres',
    password: '4321'
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');
    
    // ดูว่ามี table อะไรบ้าง
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('📋 ALL TABLES IN DATABASE:');
    tables.rows.forEach(t => console.log('  -', t.table_name));
    
    // ตรวจสอบ consent_records
    console.log('\n📊 CHECKING consent_records:');
    const check = await client.query('SELECT COUNT(*) as total FROM consent_records');
    console.log('Total records:', check.rows[0].total);
    
    // ดูข้อมูล 5 แถวแรก
    const data = await client.query('SELECT * FROM consent_records LIMIT 5');
    console.log('\nSample data:');
    data.rows.forEach((row, i) => {
      console.log(`\n[${i+1}]`);
      Object.keys(row).forEach(key => {
        if (row[key]) console.log(`  ${key}: ${row[key]}`);
      });
    });
    
    // ตรวจสอบ columns
    const cols = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'consent_records'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 COLUMNS in consent_records:');
    cols.rows.forEach(c => {
      console.log(`  - ${c.column_name} (${c.data_type}) ${c.is_nullable === 'NO' ? 'NOT NULL' : ''}`);
    });
    
  } catch (err) {
    console.error('❌ ERROR:', err.message);
    console.error('Stack:', err.stack);
  } finally {
    await client.end();
  }
}

directTest();
