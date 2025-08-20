const { pool } = require('./config/database');
const fs = require('fs').promises;
const path = require('path');

async function migrateDatabase() {
  console.log('🔧 Starting database migration...\n');
  
  try {
    // Read schema file
    const schemaPath = path.join(__dirname, 'db', 'schema.sql');
    const schema = await fs.readFile(schemaPath, 'utf8');
    
    // Execute schema
    console.log('📝 Applying schema...');
    await pool.query(schema);
    
    console.log('✅ Database migration completed successfully!');
    console.log('\n📊 Tables created:');
    console.log('  - consent_versions');
    console.log('  - consent_records');
    console.log('  - consent_history');
    console.log('  - form_templates');
    console.log('\n✨ Default data inserted');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.detail) {
      console.error('   Details:', error.detail);
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run migration
migrateDatabase();
