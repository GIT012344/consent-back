const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'consent',
  user: 'postgres',
  password: '4321'
});

async function testPolicyFetch() {
  try {
    console.log('=== Testing Policy Fetch ===\n');
    
    // 1. Check all policies in database
    const allPolicies = await pool.query(`
      SELECT id, version, title, language, user_type, is_active, 
             LEFT(content, 50) as content_preview
      FROM policy_versions 
      ORDER BY user_type, language, created_at DESC
    `);
    
    console.log('📋 All Policies in Database:');
    console.log('----------------------------');
    allPolicies.rows.forEach(p => {
      console.log(`ID: ${p.id}`);
      console.log(`  Title: ${p.title}`);
      console.log(`  Version: ${p.version}`);
      console.log(`  UserType: ${p.user_type}`);
      console.log(`  Language: ${p.language}`);
      console.log(`  Active: ${p.is_active}`);
      console.log(`  Content: ${p.content_preview}...`);
      console.log('');
    });
    
    // 2. Test fetching for different user types
    const testCases = [
      { userType: 'customer', language: 'th-TH' },
      { userType: 'customer', language: 'en-US' },
      { userType: 'employee', language: 'th-TH' },
      { userType: 'employee', language: 'en-US' },
      { userType: 'partner', language: 'th-TH' },
      { userType: 'vendor', language: 'th-TH' }
    ];
    
    console.log('\n🔍 Testing Policy Fetch by UserType & Language:');
    console.log('------------------------------------------------');
    
    for (const test of testCases) {
      const result = await pool.query(`
        SELECT id, title, version, user_type, language 
        FROM policy_versions
        WHERE user_type = $1 
          AND language = $2
          AND is_active = true
        ORDER BY created_at DESC
        LIMIT 1
      `, [test.userType, test.language]);
      
      if (result.rows.length > 0) {
        const p = result.rows[0];
        console.log(`✅ ${test.userType} + ${test.language}: Found - "${p.title}" v${p.version}`);
      } else {
        console.log(`❌ ${test.userType} + ${test.language}: No policy found`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

testPolicyFetch();
