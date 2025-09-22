const { Pool } = require('pg');
require('dotenv').config();

// Use local database configuration
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '4321',
  database: process.env.DB_NAME || 'consent'
});

async function cleanupUnnecessaryTables() {
  const client = await pool.connect();
  
  try {
    console.log('🧹 Starting cleanup of unnecessary tables...\n');
    
    // List of tables to REMOVE (everything except consent_records and consent_history)
    const tablesToRemove = [
      'admin_users',
      'audiences', 
      'audit_logs',
      'consent_attachments',
      'consent_form_fields',
      'consent_settings',
      'consent_templates',
      'consent_titles',
      'consent_version_targeting',
      'consent_versions',
      'consents',
      'form_fields',
      'form_templates',
      'policies',
      'policy_kinds',
      'policy_version_audiences',
      'policy_versions',
      'simple_policy',
      'tenants',
      'titles',
      'user_consents',
      'user_types',
      'users'
    ];
    
    console.log(`📋 Tables to remove: ${tablesToRemove.length}`);
    console.log('✅ Tables to keep: consent_records, consent_history\n');
    
    // Drop each unnecessary table
    for (const tableName of tablesToRemove) {
      try {
        console.log(`Dropping table: ${tableName}...`);
        await client.query(`DROP TABLE IF EXISTS ${tableName} CASCADE`);
        console.log(`  ✅ Dropped: ${tableName}`);
      } catch (error) {
        console.log(`  ⚠️ Error dropping ${tableName}: ${error.message}`);
      }
    }
    
    console.log('\n✅ Cleanup completed!\n');
    
    // Show remaining tables
    const remainingTables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    console.log(`📊 Remaining tables in database: ${remainingTables.rows.length}`);
    console.log('📋 Tables list:');
    remainingTables.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.table_name}`);
    });
    
    // Ensure consent_records has all necessary columns
    console.log('\n🔧 Verifying consent_records table structure...');
    await client.query(`
      ALTER TABLE consent_records 
      ADD COLUMN IF NOT EXISTS title VARCHAR(10),
      ADD COLUMN IF NOT EXISTS name_surname VARCHAR(255),
      ADD COLUMN IF NOT EXISTS id_passport VARCHAR(50),
      ADD COLUMN IF NOT EXISTS created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      ADD COLUMN IF NOT EXISTS created_time TIME DEFAULT CURRENT_TIME,
      ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45),
      ADD COLUMN IF NOT EXISTS browser VARCHAR(500),
      ADD COLUMN IF NOT EXISTS consent_type VARCHAR(50) DEFAULT 'customer',
      ADD COLUMN IF NOT EXISTS user_type VARCHAR(50) DEFAULT 'customer',
      ADD COLUMN IF NOT EXISTS consent_language VARCHAR(10) DEFAULT 'th',
      ADD COLUMN IF NOT EXISTS consent_version VARCHAR(20) DEFAULT '1.0',
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    `);
    
    // Ensure consent_history has all necessary columns
    console.log('🔧 Verifying consent_history table structure...');
    await client.query(`
      ALTER TABLE consent_history
      ADD COLUMN IF NOT EXISTS id_passport VARCHAR(50),
      ADD COLUMN IF NOT EXISTS title VARCHAR(50),
      ADD COLUMN IF NOT EXISTS name_surname VARCHAR(255),
      ADD COLUMN IF NOT EXISTS consent_version VARCHAR(20),
      ADD COLUMN IF NOT EXISTS consent_version_id INTEGER,
      ADD COLUMN IF NOT EXISTS consent_type VARCHAR(50) DEFAULT 'customer',
      ADD COLUMN IF NOT EXISTS consent_language VARCHAR(10) DEFAULT 'th',
      ADD COLUMN IF NOT EXISTS user_type VARCHAR(50) DEFAULT 'customer',
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS created_date DATE DEFAULT CURRENT_DATE,
      ADD COLUMN IF NOT EXISTS created_time TIME DEFAULT CURRENT_TIME,
      ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45),
      ADD COLUMN IF NOT EXISTS browser VARCHAR(500),
      ADD COLUMN IF NOT EXISTS action VARCHAR(50) DEFAULT 'consent_given',
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    `);
    
    console.log('\n✅ Database cleanup and verification completed!');
    console.log('   Only consent_records and consent_history tables remain.');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the cleanup
cleanupUnnecessaryTables().catch(console.error);
