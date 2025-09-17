const { Client } = require('pg');

async function fixDatabase() {
  const client = new Client({
    user: 'postgres',
    host: 'localhost',
    database: 'consent',
    password: '4321',
    port: 5432,
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Add columns one by one
    const queries = [
      "ALTER TABLE consent_versions ADD COLUMN IF NOT EXISTS title VARCHAR(255) DEFAULT ''",
      "ALTER TABLE consent_versions ADD COLUMN IF NOT EXISTS content TEXT DEFAULT ''",
      "ALTER TABLE consent_versions ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'th'",
      "ALTER TABLE consent_versions ADD COLUMN IF NOT EXISTS user_type VARCHAR(50) DEFAULT 'customer'",
      "ALTER TABLE consent_versions ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT false",
      "ALTER TABLE consent_versions ADD COLUMN IF NOT EXISTS version VARCHAR(50) DEFAULT '1.0.0'"
    ];

    for (const query of queries) {
      try {
        await client.query(query);
        const colName = query.match(/ADD COLUMN IF NOT EXISTS (\w+)/)[1];
        console.log(`✓ Column ${colName} added/verified`);
      } catch (err) {
        console.log(`Column might exist: ${err.message.substring(0, 50)}`);
      }
    }

    // Add sample data
    const countResult = await client.query('SELECT COUNT(*) FROM consent_versions');
    if (countResult.rows[0].count === '0') {
      await client.query(`
        INSERT INTO consent_versions (version, title, description, content, language, user_type, is_active)
        VALUES ('1.0.0', 'นโยบายความเป็นส่วนตัว', 'นโยบายสำหรับลูกค้า', 
                '<h2>นโยบายความเป็นส่วนตัว</h2><p>เราให้ความสำคัญกับข้อมูลของคุณ</p>', 
                'th', 'customer', true)
      `);
      console.log('✓ Sample data added');
    }

    console.log('✅ Database fixed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

fixDatabase();
