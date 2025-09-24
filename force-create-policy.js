const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '4321',
  database: 'consent'
});

async function forceCreatePolicy() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Force Create Policy\n');
    
    // 1. Ensure table exists
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
    console.log('✅ Table ready');
    
    // 2. Delete old customer/th policies
    await client.query(`
      DELETE FROM policy_versions 
      WHERE user_type = 'customer' AND language = 'th'
    `);
    
    // 3. Create new policy
    const result = await client.query(`
      INSERT INTO policy_versions (
        title,
        user_type,
        language,
        version,
        content,
        is_active
      ) VALUES (
        '001',
        'customer',
        'th',
        '1.0.0',
        '<h1>นโยบายความเป็นส่วนตัว</h1><p>นโยบายเลือกข้อหาม</p><p>ผลิตภัณฑ์นี้ความเอาผา</p><p>อำพลสนุยมความยอมพใจ</p>',
        true
      ) RETURNING id
    `);
    
    console.log(`✅ Created Policy ID: ${result.rows[0].id}`);
    
    // 4. Verify it exists
    const check = await client.query(`
      SELECT * FROM policy_versions 
      WHERE user_type = 'customer' AND language = 'th' AND is_active = true
    `);
    
    if (check.rows.length > 0) {
      console.log('\n✅ Policy exists:');
      console.log(`ID: ${check.rows[0].id}`);
      console.log(`Title: ${check.rows[0].title}`);
      console.log(`User Type: ${check.rows[0].user_type}`);
      console.log(`Language: ${check.rows[0].language}`);
      console.log(`Active: ${check.rows[0].is_active}`);
    }
    
    console.log('\n✅ Done!');
    console.log('\nNow:');
    console.log('1. Make sure backend is running: npm run dev');
    console.log('2. Go to: http://localhost:5000/consent/customer?lang=th');
    console.log('3. Press Ctrl+F5');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

forceCreatePolicy();
