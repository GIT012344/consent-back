const { pool } = require('./config/database');

async function updateSchema() {
  console.log('Updating database schema...\n');
  
  try {
    // Add missing columns
    const queries = [
      // Add consent_id
      `ALTER TABLE consent_records ADD COLUMN IF NOT EXISTS consent_id VARCHAR(50) UNIQUE`,
      
      // Add consent_type
      `ALTER TABLE consent_records ADD COLUMN IF NOT EXISTS consent_type VARCHAR(50) DEFAULT 'customer'`,
      
      // Add policy_title
      `ALTER TABLE consent_records ADD COLUMN IF NOT EXISTS policy_title VARCHAR(255)`,
      
      // Add user_agent
      `ALTER TABLE consent_records ADD COLUMN IF NOT EXISTS user_agent TEXT`,
      
      // Add created_time
      `ALTER TABLE consent_records ADD COLUMN IF NOT EXISTS created_time TIME DEFAULT CURRENT_TIME`,
      
      // Update browser_info to TEXT
      `ALTER TABLE consent_records ALTER COLUMN browser_info TYPE TEXT`
    ];
    
    for (const query of queries) {
      try {
        await pool.query(query);
        console.log('✅ Executed:', query.substring(0, 60) + '...');
      } catch (err) {
        if (err.code === '42701') { // Column already exists
          console.log('⏭️  Column already exists, skipping...');
        } else {
          console.log('⚠️  Error:', err.message);
        }
      }
    }
    
    // Create index
    try {
      await pool.query('CREATE INDEX IF NOT EXISTS idx_consent_id ON consent_records(consent_id)');
      console.log('✅ Created index on consent_id');
    } catch (err) {
      console.log('⚠️  Index error:', err.message);
    }
    
    // Show table structure
    const result = await pool.query(`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'consent_records'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Current table structure:');
    console.log('================================');
    result.rows.forEach(col => {
      const length = col.character_maximum_length ? `(${col.character_maximum_length})` : '';
      console.log(`${col.column_name}: ${col.data_type}${length}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

updateSchema();
