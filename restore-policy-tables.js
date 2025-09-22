const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '4321',
  database: process.env.DB_NAME || 'consent'
});

async function restorePolicyTables() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Restoring policy_versions table...\n');
    
    // Drop the simple_policy table if exists
    await client.query('DROP TABLE IF EXISTS simple_policy CASCADE');
    
    // Create policy_versions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS policy_versions (
        id SERIAL PRIMARY KEY,
        version VARCHAR(50),
        title VARCHAR(500),
        content TEXT,
        language VARCHAR(10),
        user_type VARCHAR(50),
        effective_date DATE,
        expiry_date DATE,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('✅ policy_versions table created\n');
    
    // Check if there's any existing data
    const checkData = await client.query('SELECT COUNT(*) FROM policy_versions');
    console.log(`📊 Existing records in policy_versions: ${checkData.rows[0].count}\n`);
    
    // Show current tables
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    console.log('📋 Current tables in database:');
    tables.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.table_name}`);
    });
    
    console.log('\n✅ Database restoration completed!');
    console.log('   policy_versions table is ready to store consent content.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

restorePolicyTables().catch(console.error);
