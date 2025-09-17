const pool = require('./config/database');

async function checkColumns() {
  try {
    // Check if policy_versions table exists
    const tableCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'policy_versions'
    `);
    
    if (tableCheck.rows.length === 0) {
      console.log('Table policy_versions does not exist!');
      console.log('Creating simplified policy table...');
      
      // Create a simple policy_versions table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS policy_versions (
          id SERIAL PRIMARY KEY,
          version VARCHAR(50),
          title VARCHAR(255),
          content TEXT,
          language VARCHAR(10),
          user_type VARCHAR(50),
          effective_date TIMESTAMP,
          expiry_date TIMESTAMP,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      console.log('Table created successfully!');
    } else {
      // Get columns
      const columns = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'policy_versions'
        ORDER BY ordinal_position
      `);
      
      console.log('Existing columns in policy_versions:');
      columns.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type}`);
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkColumns();
