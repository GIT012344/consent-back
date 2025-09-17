const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'consent',
  password: '4321',
  port: 5432,
});

async function fixSchema() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Fixing consent_versions table schema...\n');
    
    // Check current columns
    const checkColumns = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'consent_versions'
      ORDER BY ordinal_position
    `);
    
    console.log('Current columns:', checkColumns.rows.map(r => r.column_name).join(', '));
    
    // Add missing columns if they don't exist
    const columnsToAdd = [
      { name: 'title', type: 'VARCHAR(255)', default: "''" },
      { name: 'content', type: 'TEXT', default: "''" },
      { name: 'language', type: 'VARCHAR(10)', default: "'th'" },
      { name: 'user_type', type: 'VARCHAR(50)', default: "'customer'" },
      { name: 'is_active', type: 'BOOLEAN', default: 'false' },
      { name: 'version', type: 'VARCHAR(50)', default: "'1.0.0'" },
      { name: 'file_name', type: 'VARCHAR(255)', default: 'NULL' },
      { name: 'file_size', type: 'INTEGER', default: 'NULL' },
      { name: 'mime_type', type: 'VARCHAR(100)', default: 'NULL' },
      { name: 'updated_at', type: 'TIMESTAMP', default: 'CURRENT_TIMESTAMP' }
    ];
    
    const existingColumns = checkColumns.rows.map(r => r.column_name);
    
    for (const col of columnsToAdd) {
      if (!existingColumns.includes(col.name)) {
        console.log(`Adding column: ${col.name}...`);
        await client.query(`
          ALTER TABLE consent_versions 
          ADD COLUMN IF NOT EXISTS ${col.name} ${col.type} DEFAULT ${col.default}
        `);
      }
    }
    
    // Verify all columns are added
    const finalCheck = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'consent_versions'
      ORDER BY ordinal_position
    `);
    
    console.log('\n✅ Final columns:', finalCheck.rows.map(r => r.column_name).join(', '));
    
    // Insert sample data if table is empty
    const countResult = await client.query('SELECT COUNT(*) FROM consent_versions');
    if (parseInt(countResult.rows[0].count) === 0) {
      console.log('\n📝 Adding sample consent version...');
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
      console.log('✅ Sample data added');
    }
    
    console.log('\n✅ Schema fixed successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
    pool.end();
  }
}

fixSchema();
