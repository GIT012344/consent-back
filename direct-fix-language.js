const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '4321',
  database: 'consent'
});

async function directFix() {
  try {
    // Fix language for 001 and 002
    await pool.query(`
      UPDATE policy_versions 
      SET language = 'th'
      WHERE title = '001' AND user_type = 'customer'
    `);
    
    await pool.query(`
      UPDATE policy_versions 
      SET language = 'en'  
      WHERE title = '002' AND user_type = 'customer'
    `);
    
    // Check result
    const result = await pool.query(`
      SELECT user_type, language, title 
      FROM policy_versions 
      WHERE user_type = 'customer' AND is_active = true
      ORDER BY language
    `);
    
    console.log('✅ Fixed! Current state:');
    result.rows.forEach(row => {
      console.log(`   ${row.user_type}/${row.language}: "${row.title}"`);
    });
    
    await pool.end();
  } catch (err) {
    console.error('Error:', err.message);
    await pool.end();
  }
}

directFix();
