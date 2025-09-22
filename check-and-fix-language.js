const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '4321',
  database: process.env.DB_NAME || 'consent'
});

async function checkAndFixLanguage() {
  const client = await pool.connect();
  
  try {
    console.log('📊 Checking current policy_versions data...\n');
    
    // Check current state
    const checkResult = await client.query(`
      SELECT id, user_type, language, title, is_active
      FROM policy_versions
      ORDER BY user_type, language
    `);
    
    console.log('Current policies:');
    checkResult.rows.forEach(row => {
      console.log(`  ID ${row.id}: ${row.user_type}/${row.language} - "${row.title}" (Active: ${row.is_active})`);
    });
    
    // Check if we have the wrong language format (th-TH instead of th)
    const wrongFormat = await client.query(`
      SELECT COUNT(*) as count FROM policy_versions 
      WHERE language IN ('th-TH', 'en-US', 'en-EN')
    `);
    
    if (wrongFormat.rows[0].count > 0) {
      console.log('\n🔧 Found policies with wrong language format. Fixing...');
      
      // Update th-TH to th
      await client.query(`
        UPDATE policy_versions 
        SET language = 'th' 
        WHERE language IN ('th-TH', 'TH')
      `);
      
      // Update en-US or en-EN to en
      await client.query(`
        UPDATE policy_versions 
        SET language = 'en' 
        WHERE language IN ('en-US', 'en-EN', 'EN')
      `);
      
      console.log('✅ Language format fixed');
    }
    
    // Verify the fix
    console.log('\n📋 Final state:');
    const finalResult = await client.query(`
      SELECT user_type, language, title, is_active
      FROM policy_versions
      WHERE is_active = true
      ORDER BY user_type, language
    `);
    
    finalResult.rows.forEach(row => {
      console.log(`  ✅ ${row.user_type}/${row.language}: "${row.title}"`);
    });
    
    // Test the query that the API uses
    console.log('\n🧪 Testing API query for customer/th:');
    const testQuery = await client.query(`
      SELECT id, title, content, user_type, language
      FROM policy_versions
      WHERE user_type = 'customer' AND language = 'th' AND is_active = true
      LIMIT 1
    `);
    
    if (testQuery.rows.length > 0) {
      const policy = testQuery.rows[0];
      console.log(`  ✅ Found: "${policy.title}"`);
      console.log(`     Content preview: ${policy.content.substring(0, 100)}...`);
    } else {
      console.log('  ❌ No policy found for customer/th');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

checkAndFixLanguage();
