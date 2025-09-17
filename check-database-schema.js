const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '4321',
  database: process.env.DB_NAME || 'consent'
});

async function checkDatabaseSchema() {
  const client = await pool.connect();
  
  try {
    console.log('📊 Current Database Schema:\n');
    
    // Get all tables
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    console.log(`Found ${tables.rows.length} tables:\n`);
    
    for (const table of tables.rows) {
      console.log(`\n📋 Table: ${table.table_name}`);
      console.log('─'.repeat(50));
      
      // Get columns for each table
      const columns = await client.query(`
        SELECT 
          column_name,
          data_type,
          character_maximum_length,
          is_nullable,
          column_default
        FROM information_schema.columns 
        WHERE table_name = $1
        ORDER BY ordinal_position
      `, [table.table_name]);
      
      // Get row count
      const countResult = await client.query(`SELECT COUNT(*) as count FROM ${table.table_name}`);
      console.log(`   Rows: ${countResult.rows[0].count}\n`);
      
      console.log('   Columns:');
      columns.rows.forEach(col => {
        const type = col.character_maximum_length 
          ? `${col.data_type}(${col.character_maximum_length})`
          : col.data_type;
        const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
        const defaultVal = col.column_default ? ` DEFAULT ${col.column_default.substring(0, 30)}` : '';
        console.log(`     - ${col.column_name}: ${type} ${nullable}${defaultVal}`);
      });
      
      // Get indexes
      const indexes = await client.query(`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = $1
        AND schemaname = 'public'
      `, [table.table_name]);
      
      if (indexes.rows.length > 0) {
        console.log('\n   Indexes:');
        indexes.rows.forEach(idx => {
          console.log(`     - ${idx.indexname}`);
        });
      }
    }
    
    // Check which columns are actually being used in consent_records
    console.log('\n\n📊 Consent Records Analysis:');
    console.log('─'.repeat(50));
    
    const consentColumns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'consent_records'
      ORDER BY ordinal_position
    `);
    
    console.log('\nColumns in consent_records table:');
    for (const col of consentColumns.rows) {
      // Check if column has any non-null values
      try {
        const checkData = await client.query(
          `SELECT COUNT(*) as total, COUNT(${col.column_name}) as non_null 
           FROM consent_records`
        );
        const usage = checkData.rows[0].non_null > 0 ? '✅ Used' : '❌ Not used';
        console.log(`   - ${col.column_name}: ${usage} (${checkData.rows[0].non_null}/${checkData.rows[0].total} records)`);
      } catch (err) {
        console.log(`   - ${col.column_name}: ⚠️ Error checking`);
      }
    }
    
    console.log('\n✅ Schema check completed!');
    
  } catch (error) {
    console.error('❌ Error checking schema:', error.message);
  } finally {
    client.release();
    pool.end();
  }
}

// Run check
checkDatabaseSchema().catch(console.error);
