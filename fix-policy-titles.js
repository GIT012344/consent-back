const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '4321',
  database: 'consent'
});

async function fixPolicyTitles() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Fixing policy titles and languages...\n');
    
    // Show current state
    const before = await client.query(`
      SELECT id, user_type, language, title 
      FROM policy_versions 
      WHERE is_active = true
      ORDER BY user_type, language
    `);
    
    console.log('Current policies:');
    before.rows.forEach(row => {
      console.log(`  ID ${row.id}: ${row.user_type}/${row.language} = "${row.title}"`);
    });
    
    // Fix title "01" to "001" for customer/th
    await client.query(`
      UPDATE policy_versions 
      SET title = '001'
      WHERE title = '01' AND user_type = 'customer' AND language = 'th'
    `);
    console.log('\n✅ Fixed title "01" to "001"');
    
    // Ensure language mappings are correct
    await client.query(`
      UPDATE policy_versions 
      SET language = 'th'
      WHERE title IN ('001', '003') AND language != 'th'
    `);
    
    await client.query(`
      UPDATE policy_versions 
      SET language = 'en'
      WHERE title = '002' AND language != 'en'
    `);
    console.log('✅ Fixed language mappings');
    
    // Show final state
    const after = await client.query(`
      SELECT user_type, language, title 
      FROM policy_versions 
      WHERE is_active = true
      ORDER BY user_type, language
    `);
    
    console.log('\nFinal state:');
    after.rows.forEach(row => {
      console.log(`  ✅ ${row.user_type}/${row.language}: "${row.title}"`);
    });
    
    console.log('\n✅ All fixed!');
    console.log('\nTest URLs:');
    console.log('  Customer Thai: http://localhost:5000/consent/customer?lang=th (should show 001)');
    console.log('  Customer English: http://localhost:5000/consent/customer?lang=en (should show 002)');
    console.log('  Employee Thai: http://localhost:5000/consent/employee?lang=th (should show 003)');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

fixPolicyTitles();
