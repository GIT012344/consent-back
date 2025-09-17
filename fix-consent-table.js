const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '4321',
  database: process.env.DB_NAME || 'consent'
});

async function fixConsentTable() {
  const client = await pool.connect();
  
  try {
    console.log('Adding missing columns to consent_records table...');
    
    // Add missing columns one by one
    const alterQueries = [
      `ALTER TABLE consent_records ADD COLUMN IF NOT EXISTS consent_id VARCHAR(100)`,
      `ALTER TABLE consent_records ADD COLUMN IF NOT EXISTS email VARCHAR(255)`,
      `ALTER TABLE consent_records ADD COLUMN IF NOT EXISTS phone VARCHAR(20)`,
      `ALTER TABLE consent_records ADD COLUMN IF NOT EXISTS consent_version_id INTEGER`,
      `ALTER TABLE consent_records ADD COLUMN IF NOT EXISTS policy_title VARCHAR(255)`,
      `ALTER TABLE consent_records ADD COLUMN IF NOT EXISTS user_agent TEXT`
    ];
    
    for (const query of alterQueries) {
      try {
        await client.query(query);
        console.log(`✅ Executed: ${query}`);
      } catch (err) {
        console.log(`⚠️ Column might already exist: ${err.message}`);
      }
    }
    
    // Also fix consent_history table
    console.log('\nAdding missing columns to consent_history table...');
    
    const historyQueries = [
      `ALTER TABLE consent_history ADD COLUMN IF NOT EXISTS policy_title VARCHAR(255)`
    ];
    
    for (const query of historyQueries) {
      try {
        await client.query(query);
        console.log(`✅ Executed: ${query}`);
      } catch (err) {
        console.log(`⚠️ Column might already exist: ${err.message}`);
      }
    }
    
    console.log('\n✅ Database schema updated successfully!');
    
  } catch (error) {
    console.error('❌ Error updating database schema:', error);
  } finally {
    client.release();
    pool.end();
  }
}

fixConsentTable();
