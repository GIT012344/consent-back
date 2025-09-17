const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '4321',
  database: process.env.DB_NAME || 'consent'
});

async function fixDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('Adding missing columns to consent_records...');
    
    const queries = [
      "ALTER TABLE consent_records ADD COLUMN IF NOT EXISTS browser VARCHAR(500)",
      "ALTER TABLE consent_records ADD COLUMN IF NOT EXISTS consent_id VARCHAR(100)",
      "ALTER TABLE consent_records ADD COLUMN IF NOT EXISTS email VARCHAR(255)",
      "ALTER TABLE consent_records ADD COLUMN IF NOT EXISTS phone VARCHAR(20)",
      "ALTER TABLE consent_records ADD COLUMN IF NOT EXISTS user_agent TEXT",
      "ALTER TABLE consent_records ADD COLUMN IF NOT EXISTS consent_version_id INTEGER",
      "ALTER TABLE consent_records ADD COLUMN IF NOT EXISTS policy_title VARCHAR(255)"
    ];
    
    for (const query of queries) {
      try {
        await client.query(query);
        console.log(`✅ ${query.substring(0, 60)}...`);
      } catch (err) {
        console.log(`⚠️ ${err.message}`);
      }
    }
    
    // Fix consent_history too
    try {
      await client.query("ALTER TABLE consent_history ADD COLUMN IF NOT EXISTS policy_title VARCHAR(255)");
      console.log('✅ Added policy_title to consent_history');
    } catch (err) {
      console.log(`⚠️ consent_history: ${err.message}`);
    }
    
    console.log('\n✅ Database fixed successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    pool.end();
  }
}

fixDatabase();
