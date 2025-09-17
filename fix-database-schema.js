const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '4321',
  database: process.env.DB_NAME || 'consent'
});

async function fixDatabaseSchema() {
  const client = await pool.connect();
  
  try {
    console.log('Fixing consent_records table schema...\n');
    
    // Drop the existing table and recreate with all required columns
    console.log('Dropping and recreating consent_records table...');
    
    await client.query('DROP TABLE IF EXISTS consent_records CASCADE');
    
    const createTableQuery = `
      CREATE TABLE consent_records (
        id SERIAL PRIMARY KEY,
        consent_id VARCHAR(100),
        title VARCHAR(50),
        name_surname VARCHAR(255) NOT NULL,
        id_passport VARCHAR(50) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(20),
        created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_time TIME DEFAULT CURRENT_TIME,
        ip_address VARCHAR(45),
        browser VARCHAR(500),
        user_agent TEXT,
        consent_type VARCHAR(50) DEFAULT 'customer',
        user_type VARCHAR(50) DEFAULT 'customer',
        consent_language VARCHAR(10) DEFAULT 'th',
        consent_version VARCHAR(20) DEFAULT '1.0',
        consent_version_id INTEGER,
        policy_title VARCHAR(255),
        is_active BOOLEAN DEFAULT TRUE,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    await client.query(createTableQuery);
    console.log('✅ consent_records table created successfully');
    
    // Create indexes
    await client.query('CREATE INDEX IF NOT EXISTS idx_consent_records_id_passport ON consent_records(id_passport)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_consent_records_consent_id ON consent_records(consent_id)');
    console.log('✅ Indexes created');
    
    // Fix consent_history table
    console.log('\nFixing consent_history table...');
    
    // Check if consent_history exists
    const checkHistory = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'consent_history'
      )
    `);
    
    if (!checkHistory.rows[0].exists) {
      const createHistoryQuery = `
        CREATE TABLE consent_history (
          id SERIAL PRIMARY KEY,
          id_passport VARCHAR(50) NOT NULL,
          title VARCHAR(50),
          name_surname VARCHAR(255) NOT NULL,
          consent_version VARCHAR(20) NOT NULL,
          consent_version_id INTEGER,
          consent_type VARCHAR(50) DEFAULT 'customer',
          consent_language VARCHAR(10) DEFAULT 'th',
          user_type VARCHAR(50) DEFAULT 'customer',
          policy_title VARCHAR(255),
          is_active BOOLEAN DEFAULT FALSE,
          created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_time TIME DEFAULT CURRENT_TIME,
          ip_address VARCHAR(45),
          browser VARCHAR(500),
          action VARCHAR(50) DEFAULT 'consent_given',
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;
      await client.query(createHistoryQuery);
      console.log('✅ consent_history table created');
    } else {
      // Add missing columns to existing table
      await client.query('ALTER TABLE consent_history ADD COLUMN IF NOT EXISTS policy_title VARCHAR(255)');
      console.log('✅ consent_history table updated');
    }
    
    console.log('\n✅ Database schema fixed successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing database schema:', error.message);
    throw error;
  } finally {
    client.release();
    pool.end();
  }
}

fixDatabaseSchema().catch(console.error);
