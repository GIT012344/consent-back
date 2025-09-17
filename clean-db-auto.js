const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'consent',
  user: 'postgres',
  password: '4321'
});

async function cleanDatabase() {
  try {
    console.log('=== CLEANING DATABASE ===\n');
    
    // 1. ดู tables ทั้งหมด
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('📋 Current tables:');
    tables.rows.forEach(t => console.log('  -', t.table_name));
    
    // 2. Tables ที่ไม่ใช้และควรลบ
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
    
    console.log('\n❌ Dropping unused tables:');
    for (const table of tablesToDrop) {
      const exists = tables.rows.some(t => t.table_name === table);
      if (exists) {
        console.log(`  - Dropping ${table}...`);
        await pool.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
      }
    }
    
    // 3. ตรวจสอบ columns ใน consent_records
    console.log('\n📊 Checking consent_records columns...');
    const columns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'consent_records'
      ORDER BY ordinal_position
    `);
    
    console.log('Current columns:');
    columns.rows.forEach(c => console.log(`  - ${c.column_name} (${c.data_type})`));
    
    // 4. ลบ columns ที่ซ้ำซ้อนหรือไม่ใช้
    const columnsToRemove = [
      'title',           // ซ้ำกับ name_surname
      'browser',         // ไม่จำเป็น
      'email',           // ไม่มีข้อมูล
      'phone',           // ไม่มีข้อมูล
      'consent_version_id', // ใช้ consent_version แทน
      'updated_at'       // ซ้ำกับ created_date
    ];
    
    console.log('\n🔧 Removing duplicate/unused columns...');
    for (const col of columnsToRemove) {
      const hasColumn = columns.rows.some(c => c.column_name === col);
      if (hasColumn) {
        try {
          console.log(`  - Dropping column: ${col}`);
          await pool.query(`ALTER TABLE consent_records DROP COLUMN IF EXISTS ${col}`);
        } catch (err) {
          console.log(`    ⚠️ Could not drop ${col}: ${err.message}`);
        }
      }
    }
    
    // 5. แสดงผลลัพธ์สุดท้าย
    console.log('\n✅ CLEANUP COMPLETE!\n');
    
    // แสดง tables ที่เหลือ
    const finalTables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('📋 Remaining tables:');
    finalTables.rows.forEach(t => console.log('  -', t.table_name));
    
    // แสดง columns ที่เหลือใน consent_records
    const finalColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'consent_records'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📊 Final consent_records structure:');
    finalColumns.rows.forEach(c => console.log(`  - ${c.column_name} (${c.data_type})`));
    
    // ตรวจสอบข้อมูล
    const count = await pool.query('SELECT COUNT(*) FROM consent_records');
    console.log(`\n📈 Total records: ${count.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

// รันทันที
cleanDatabase();
