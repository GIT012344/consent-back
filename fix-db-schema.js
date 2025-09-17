const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'consent',
  password: '4321',
  port: 5432,
});

async function fixSchema() {
  let client;
  try {
    client = await pool.connect();
    console.log('Connected to database');
    
    // Add columns one by one
    const columns = [
      "ALTER TABLE consent_versions ADD COLUMN IF NOT EXISTS title VARCHAR(255) DEFAULT ''",
      "ALTER TABLE consent_versions ADD COLUMN IF NOT EXISTS content TEXT DEFAULT ''",
      "ALTER TABLE consent_versions ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'th'",
      "ALTER TABLE consent_versions ADD COLUMN IF NOT EXISTS user_type VARCHAR(50) DEFAULT 'customer'",
      "ALTER TABLE consent_versions ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT false",
      "ALTER TABLE consent_versions ADD COLUMN IF NOT EXISTS version VARCHAR(50) DEFAULT '1.0.0'",
      "ALTER TABLE consent_versions ADD COLUMN IF NOT EXISTS file_name VARCHAR(255)",
      "ALTER TABLE consent_versions ADD COLUMN IF NOT EXISTS file_size INTEGER",
      "ALTER TABLE consent_versions ADD COLUMN IF NOT EXISTS mime_type VARCHAR(100)",
      "ALTER TABLE consent_versions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP"
    ];
    
    for (const query of columns) {
      try {
        await client.query(query);
        console.log('✓ ' + query.split('ADD COLUMN IF NOT EXISTS ')[1].split(' ')[0] + ' added');
      } catch (err) {
        console.log('Column might already exist: ' + err.message);
      }
    }
    
    // Check if table is empty
    const count = await client.query('SELECT COUNT(*) FROM consent_versions');
    if (parseInt(count.rows[0].count) === 0) {
      console.log('Adding sample data...');
      await client.query(`
        INSERT INTO consent_versions (
          title, description, content, language, user_type, 
          is_active, version, created_at
        ) VALUES (
          'นโยบายความเป็นส่วนตัว',
          'นโยบายความเป็นส่วนตัวสำหรับลูกค้า',
          '<h2>นโยบายความเป็นส่วนตัว</h2><p>เราให้ความสำคัญกับความเป็นส่วนตัวของคุณ</p>',
          'th',
          'customer',
          true,
          '1.0.0',
          NOW()
        )
      `);
      console.log('✓ Sample data added');
    }
    
    console.log('\n✅ Schema fixed successfully!');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

fixSchema();
