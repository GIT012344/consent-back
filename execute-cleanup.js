const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'consent',
  user: 'postgres',
  password: '4321'
});

async function executeCleanup() {
  const client = await pool.connect();
  
  try {
    console.log('=== STARTING DATABASE CLEANUP ===\n');
    
    // 1. ลบ tables ที่ไม่ใช้
    const tablesToDrop = [
      'admin_users',
      'audiences',
      'audit_logs',
      'consent_form_fields',
      'consent_titles',
      'consent_versions',
      'consent_version_targeting',
      'form_templates',
      'policies',
      'policy_kinds',
      'tenants',
      'user_consents',
      'users'
    ];
    
    console.log('📋 Dropping unused tables...');
    for (const table of tablesToDrop) {
      try {
        await client.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
        console.log(`  ✅ Dropped: ${table}`);
      } catch (err) {
        console.log(`  ⚠️ Error dropping ${table}: ${err.message}`);
      }
    }
    
    // 2. ลบ columns ที่ซ้ำซ้อน
    const columnsToRemove = [
      'title',
      'browser',
      'email',
      'phone',
      'consent_version_id',
      'updated_at'
    ];
    
    console.log('\n📊 Removing duplicate columns from consent_records...');
    for (const col of columnsToRemove) {
      try {
        await client.query(`ALTER TABLE consent_records DROP COLUMN IF EXISTS ${col}`);
        console.log(`  ✅ Removed column: ${col}`);
      } catch (err) {
        console.log(`  ⚠️ Error removing ${col}: ${err.message}`);
      }
    }
    
    // 3. แสดงผลลัพธ์
    console.log('\n=== CLEANUP COMPLETE ===\n');
    
    // แสดง tables ที่เหลือ
    const remainingTables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('📋 Remaining tables:');
    remainingTables.rows.forEach(t => console.log(`  - ${t.table_name}`));
    
    // แสดง columns ที่เหลือ
    const remainingColumns = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'consent_records'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📊 Final consent_records structure:');
    remainingColumns.rows.forEach(c => console.log(`  - ${c.column_name} (${c.data_type})`));
    
    // นับ records
    const count = await client.query('SELECT COUNT(*) FROM consent_records');
    console.log(`\n📈 Total records preserved: ${count.rows[0].count}`);
    
    console.log('\n✅ Database cleaned successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

executeCleanup();
