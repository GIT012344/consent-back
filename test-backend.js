const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'consent',
  user: 'postgres',
  password: '4321'
});

async function testBackend() {
  try {
    console.log('=== TESTING BACKEND ===\n');
    
    // 1. Test database connection
    const test = await pool.query('SELECT NOW()');
    console.log('✅ Database connected:', test.rows[0].now);
    
    // 2. Check if policy_versions table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'policy_versions'
      )
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.log('❌ Table policy_versions does not exist!');
      console.log('Creating table...');
      
      await pool.query(`
        CREATE TABLE policy_versions (
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
      
      console.log('✅ Table created');
    } else {
      console.log('✅ Table policy_versions exists');
    }
    
    // 3. Check existing policies
    const policies = await pool.query('SELECT COUNT(*) FROM policy_versions');
    console.log(`\n📊 Total policies in database: ${policies.rows[0].count}`);
    
    // 4. Show last 3 policies
    const recent = await pool.query(`
      SELECT id, title, version, language, user_type, created_at 
      FROM policy_versions 
      ORDER BY id DESC 
      LIMIT 3
    `);
    
    if (recent.rows.length > 0) {
      console.log('\n📋 Recent policies:');
      recent.rows.forEach(p => {
        console.log(`  ID ${p.id}: ${p.title} (v${p.version}) - ${p.user_type || 'no type'} - ${p.language}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

testBackend();
