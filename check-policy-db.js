const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'consent',
  user: 'postgres',
  password: '4321'
});

async function checkDatabase() {
  try {
    console.log('=== CHECKING DATABASE ===\n');
    
    // Check all policies
    const policies = await pool.query(`
      SELECT id, user_type, language, version, title, 
             LENGTH(content) as content_length, is_active, created_at
      FROM policy_versions 
      ORDER BY created_at DESC
    `);
    
    console.log(`📊 Total policies: ${policies.rows.length}\n`);
    
    policies.rows.forEach(p => {
      console.log(`ID ${p.id}: ${p.title}`);
      console.log(`  - User: ${p.user_type || 'NULL'}, Lang: ${p.language}, Ver: ${p.version}`);
      console.log(`  - Content length: ${p.content_length} chars`);
      console.log(`  - Created: ${new Date(p.created_at).toLocaleString()}`);
      console.log('');
    });
    
    // Get full content of latest policy
    if (policies.rows.length > 0) {
      const latest = await pool.query('SELECT content FROM policy_versions ORDER BY id DESC LIMIT 1');
      console.log('Latest policy content:');
      console.log('-------------------');
      console.log(latest.rows[0].content);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkDatabase();
