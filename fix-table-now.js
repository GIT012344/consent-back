const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'consent',
  password: '4321',
  port: 5432,
});

async function fixTable() {
  try {
    // First, check if table exists and what columns it has
    const checkTable = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'consent_versions'
    `);
    
    if (checkTable.rows.length === 0) {
      console.log('Creating consent_versions table...');
      // Create table with all required columns
      await pool.query(`
        CREATE TABLE IF NOT EXISTS consent_versions (
          id SERIAL PRIMARY KEY,
          version VARCHAR(50) DEFAULT '1.0.0',
          title VARCHAR(255) DEFAULT '',
          description TEXT,
          content TEXT DEFAULT '',
          language VARCHAR(10) DEFAULT 'th',
          user_type VARCHAR(50) DEFAULT 'customer',
          is_active BOOLEAN DEFAULT false,
          file_path VARCHAR(255),
          file_content TEXT,
          file_size INTEGER,
          file_name VARCHAR(255),
          mime_type VARCHAR(100),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Table created');
    } else {
      console.log('Table exists, adding missing columns...');
      const existingColumns = checkTable.rows.map(r => r.column_name);
      
      // Add missing columns
      const columnsToAdd = [
        { name: 'title', sql: "ALTER TABLE consent_versions ADD COLUMN title VARCHAR(255) DEFAULT ''" },
        { name: 'content', sql: "ALTER TABLE consent_versions ADD COLUMN content TEXT DEFAULT ''" },
        { name: 'language', sql: "ALTER TABLE consent_versions ADD COLUMN language VARCHAR(10) DEFAULT 'th'" },
        { name: 'user_type', sql: "ALTER TABLE consent_versions ADD COLUMN user_type VARCHAR(50) DEFAULT 'customer'" },
        { name: 'is_active', sql: "ALTER TABLE consent_versions ADD COLUMN is_active BOOLEAN DEFAULT false" },
        { name: 'version', sql: "ALTER TABLE consent_versions ADD COLUMN version VARCHAR(50) DEFAULT '1.0.0'" },
        { name: 'file_name', sql: "ALTER TABLE consent_versions ADD COLUMN file_name VARCHAR(255)" },
        { name: 'mime_type', sql: "ALTER TABLE consent_versions ADD COLUMN mime_type VARCHAR(100)" },
        { name: 'updated_at', sql: "ALTER TABLE consent_versions ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP" }
      ];
      
      for (const col of columnsToAdd) {
        if (!existingColumns.includes(col.name)) {
          try {
            await pool.query(col.sql);
            console.log(`✅ Added column: ${col.name}`);
          } catch (e) {
            console.log(`⚠️ Column ${col.name} might already exist`);
          }
        }
      }
    }
    
    // Check if we have any data
    const count = await pool.query('SELECT COUNT(*) FROM consent_versions');
    if (parseInt(count.rows[0].count) === 0) {
      console.log('Adding sample data...');
      await pool.query(`
        INSERT INTO consent_versions (
          version, title, description, content, language, user_type, is_active
        ) VALUES (
          '1.0.0',
          'นโยบายความเป็นส่วนตัว',
          'นโยบายความเป็นส่วนตัวสำหรับลูกค้า',
          '<h2>นโยบายความเป็นส่วนตัว</h2>
          <p>เราให้ความสำคัญกับความเป็นส่วนตัวของคุณ</p>
          <h3>ข้อมูลที่เราเก็บ:</h3>
          <ul>
            <li>ชื่อ-นามสกุล</li>
            <li>อีเมล</li>
            <li>เบอร์โทรศัพท์</li>
          </ul>',
          'th',
          'customer',
          true
        )
      `);
      console.log('✅ Sample data added');
    }
    
    // Verify final structure
    const finalCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'consent_versions'
      ORDER BY ordinal_position
    `);
    
    console.log('\n✅ Final table structure:');
    console.log(finalCheck.rows.map(r => '  - ' + r.column_name).join('\n'));
    
    console.log('\n✅ Database schema fixed successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

fixTable();
