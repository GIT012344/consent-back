const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '4321',
  database: process.env.DB_NAME || 'consent'
});

async function cleanupDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('🧹 Starting database cleanup...\n');
    
    // 1. Clean up unused tables
    console.log('📋 Checking for unused tables...');
    const unusedTables = [
      'users',           // Not used - we use consent_records
      'consents',        // Not used - we use consent_records
      'consent_version_targeting', // Not used
      'admin_users',     // Not used for now
      'audit_logs'       // Not used for now
    ];
    
    for (const table of unusedTables) {
      try {
        const checkTable = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = $1
          )
        `, [table]);
        
        if (checkTable.rows[0].exists) {
          await client.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
          console.log(`   ✅ Dropped table: ${table}`);
        }
      } catch (err) {
        console.log(`   ⚠️ Could not drop ${table}: ${err.message}`);
      }
    }
    
    // 2. Clean up unused columns from consent_records
    console.log('\n📋 Cleaning up consent_records table...');
    
    // Check current columns
    const currentColumns = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'consent_records'
      ORDER BY ordinal_position
    `);
    
    console.log('   Current columns:');
    currentColumns.rows.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type})`);
    });
    
    // Columns we actually use
    const requiredColumns = [
      'id',
      'name_surname',
      'id_passport',
      'created_date',
      'created_time',
      'ip_address',
      'browser',
      'consent_type',
      'user_type',
      'consent_language',
      'consent_version',
      'is_active',
      'updated_at'
    ];
    
    // Drop columns that don't exist in our simplified schema
    const columnsToRemove = [
      'title',           // Not needed - removed from form
      'consent_id',      // Not used
      'email',           // Not stored for privacy
      'phone',           // Not stored for privacy
      'policy_title',    // Not used
      'consent_version_id', // Not used
      'user_agent'       // Redundant with browser
    ];
    
    for (const column of columnsToRemove) {
      try {
        const checkColumn = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'consent_records' 
            AND column_name = $1
          )
        `, [column]);
        
        if (checkColumn.rows[0].exists) {
          await client.query(`ALTER TABLE consent_records DROP COLUMN IF EXISTS ${column}`);
          console.log(`   ✅ Dropped column: ${column}`);
        }
      } catch (err) {
        console.log(`   ⚠️ Could not drop column ${column}: ${err.message}`);
      }
    }
    
    // 3. Clean up consent_history table
    console.log('\n📋 Cleaning up consent_history table...');
    
    const historyColumns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'consent_history'
    `);
    
    if (historyColumns.rows.length > 0) {
      const historyColumnsToRemove = [
        'title',
        'consent_version_id',
        'policy_title',
        'created_date',  // Use default timestamp instead
        'created_time'   // Use default timestamp instead
      ];
      
      for (const column of historyColumnsToRemove) {
        try {
          await client.query(`ALTER TABLE consent_history DROP COLUMN IF EXISTS ${column}`);
          console.log(`   ✅ Dropped column from history: ${column}`);
        } catch (err) {
          console.log(`   ⚠️ Could not drop history column ${column}: ${err.message}`);
        }
      }
    }
    
    // 4. Show final schema
    console.log('\n📊 Final Database Schema:');
    
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    for (const table of tables.rows) {
      console.log(`\n   Table: ${table.table_name}`);
      const columns = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = $1
        ORDER BY ordinal_position
      `, [table.table_name]);
      
      columns.rows.forEach(col => {
        const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
        const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
        console.log(`     - ${col.column_name}: ${col.data_type} ${nullable}${defaultVal}`);
      });
    }
    
    // 5. Optimize database
    console.log('\n🔧 Optimizing database...');
    await client.query('VACUUM ANALYZE consent_records');
    await client.query('REINDEX TABLE consent_records');
    console.log('   ✅ Database optimized');
    
    console.log('\n✅ Database cleanup completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error.message);
    throw error;
  } finally {
    client.release();
    pool.end();
  }
}

// Run cleanup
cleanupDatabase().catch(console.error);
