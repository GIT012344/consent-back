const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '4321',
  database: 'consent'
});

async function manualFixLanguage() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Fixing language mapping...\n');
    
    // Show current state
    const before = await client.query(`
      SELECT id, user_type, language, title 
      FROM policy_versions 
      WHERE user_type = 'customer' AND is_active = true
    `);
    
    console.log('Before fix:');
    before.rows.forEach(row => {
      console.log(`  ID ${row.id}: ${row.language} = "${row.title}"`);
    });
    
    // Fix 001 to Thai
    const fix1 = await client.query(`
      UPDATE policy_versions 
      SET language = 'th'
      WHERE title = '001' AND user_type = 'customer'
      RETURNING id, title, language
    `);
    
    if (fix1.rows.length > 0) {
      console.log(`\n✅ Fixed 001 to Thai (th)`);
    }
    
    // Fix 002 to English
    const fix2 = await client.query(`
      UPDATE policy_versions 
      SET language = 'en'
      WHERE title = '002' AND user_type = 'customer'
      RETURNING id, title, language
    `);
    
    if (fix2.rows.length > 0) {
      console.log(`✅ Fixed 002 to English (en)`);
    }
    
    // Show result
    const after = await client.query(`
      SELECT user_type, language, title 
      FROM policy_versions 
      WHERE user_type = 'customer' AND is_active = true
      ORDER BY language
    `);
    
    console.log('\nAfter fix:');
    after.rows.forEach(row => {
      console.log(`  ${row.user_type}/${row.language}: "${row.title}"`);
    });
    
    console.log('\n✅ Language mapping fixed!');
    console.log('\nTest URLs:');
    console.log('  Thai (should show 001): http://localhost:5000/consent/customer?lang=th');
    console.log('  English (should show 002): http://localhost:5000/consent/customer?lang=en');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

manualFixLanguage();
