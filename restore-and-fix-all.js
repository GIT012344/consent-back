const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '4321',
  database: process.env.DB_NAME || 'consent'
});

async function restoreAndFixAll() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 RESTORING AND FIXING EVERYTHING\n');
    console.log('='.repeat(50));
    
    // 1. Ensure policy_versions table exists
    console.log('1. Ensuring policy_versions table exists...');
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
    console.log('   ✅ Table ready');
    
    // 2. Check existing policies
    const existing = await client.query(`
      SELECT id, user_type, language, title 
      FROM policy_versions 
      WHERE user_type = 'customer' AND is_active = true
    `);
    
    console.log(`\n2. Found ${existing.rows.length} existing policies`);
    
    // 3. Update language mapping for 001 and 002
    if (existing.rows.length > 0) {
      console.log('\n3. Fixing language mapping...');
      
      // Fix 001 to Thai
      const fix001 = await client.query(`
        UPDATE policy_versions 
        SET language = 'th'
        WHERE title = '001' AND user_type = 'customer'
        RETURNING id, title, language
      `);
      if (fix001.rows.length > 0) {
        console.log('   ✅ Policy 001 set to Thai (th)');
      }
      
      // Fix 002 to English
      const fix002 = await client.query(`
        UPDATE policy_versions 
        SET language = 'en'
        WHERE title = '002' AND user_type = 'customer'
        RETURNING id, title, language
      `);
      if (fix002.rows.length > 0) {
        console.log('   ✅ Policy 002 set to English (en)');
      }
    }
    
    // 4. Verify final state
    console.log('\n4. FINAL STATE:');
    const final = await client.query(`
      SELECT id, user_type, language, title, 
             LEFT(content, 50) as content_preview,
             is_active
      FROM policy_versions
      WHERE is_active = true
      ORDER BY user_type, language
    `);
    
    if (final.rows.length === 0) {
      console.log('   ❌ No active policies found!');
      console.log('   Please create policies through Admin Panel');
    } else {
      console.log(`   Found ${final.rows.length} active policies:\n`);
      final.rows.forEach(p => {
        console.log(`   ${p.user_type}/${p.language}: "${p.title}"`);
        console.log(`      Content: ${p.content_preview}...`);
      });
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ SYSTEM READY!\n');
    console.log('URLs to test (Port 5000):');
    console.log('  Thai: http://localhost:5000/consent/customer?lang=th');
    console.log('  English: http://localhost:5000/consent/customer?lang=en');
    console.log('  Admin: http://localhost:5000/admin/login');
    console.log('  Create Policy: http://localhost:5000/admin/create-policy');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

restoreAndFixAll();
