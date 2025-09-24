const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '4321',
  database: process.env.DB_NAME || 'consent'
});

async function checkPolicyContent() {
  const client = await pool.connect();
  
  try {
    console.log('📊 Checking policy_versions table content...\n');
    
    const result = await pool.query(`
      SELECT id, version, title, user_type, language, is_active,
             LEFT(content, 100) as content_preview,
             created_at
      FROM policy_versions
      ORDER BY created_at DESC
    `);
    
    console.log(`Found ${result.rows.length} policies:\n`);
    
    if (result.rows.length === 0) {
      console.log('❌ No policies found in database!');
      console.log('   You need to create policies through the admin panel.');
    } else {
      result.rows.forEach((row, index) => {
        console.log(`${index + 1}. Policy ID: ${row.id}`);
        console.log(`   Title: ${row.title}`);
        console.log(`   User Type: ${row.user_type}`);
        console.log(`   Language: ${row.language}`);
        console.log(`   Version: ${row.version}`);
        console.log(`   Active: ${row.is_active ? '✅' : '❌'}`);
        console.log(`   Content Preview: ${row.content_preview}...`);
        console.log(`   Created: ${row.created_at}`);
        console.log('');
      });
    }
    
    // Check for each userType/language combination
    const combinations = [
      { user_type: 'customer', language: 'th' },
      { user_type: 'customer', language: 'en' },
      { user_type: 'employee', language: 'th' },
      { user_type: 'employee', language: 'en' },
      { user_type: 'partner', language: 'th' },
      { user_type: 'partner', language: 'en' }
    ];
    
    console.log('\n📋 Checking for active policies by user type and language:');
    for (const combo of combinations) {
      const check = await pool.query(
        'SELECT id, title FROM policy_versions WHERE user_type = $1 AND language = $2 AND is_active = true',
        [combo.user_type, combo.language]
      );
      
      if (check.rows.length > 0) {
        console.log(`✅ ${combo.user_type}/${combo.language}: "${check.rows[0].title}" (ID: ${check.rows[0].id})`);
      } else {
        console.log(`❌ ${combo.user_type}/${combo.language}: No active policy`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

checkPolicyContent();
