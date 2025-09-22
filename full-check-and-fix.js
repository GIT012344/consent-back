const { Pool } = require('pg');
const axios = require('axios');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '4321',
  database: process.env.DB_NAME || 'consent'
});

async function fullCheckAndFix() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 FULL SYSTEM CHECK AND FIX\n');
    console.log('='.repeat(50));
    
    // 1. Check what's in database
    console.log('\n📊 DATABASE CHECK:');
    const policies = await client.query(`
      SELECT id, user_type, language, title, 
             LEFT(content, 100) as content_preview,
             is_active
      FROM policy_versions
      WHERE is_active = true
      ORDER BY user_type, language
    `);
    
    console.log(`Found ${policies.rows.length} active policies:`);
    policies.rows.forEach(p => {
      console.log(`\n  ID ${p.id}: ${p.user_type}/${p.language}`);
      console.log(`  Title: "${p.title}"`);
      console.log(`  Content: ${p.content_preview}...`);
    });
    
    // 2. Fix language mapping if needed
    console.log('\n🔧 FIXING LANGUAGE MAPPING:');
    
    // Check if 001 and 002 exist
    const check001 = await client.query(`
      SELECT id, language FROM policy_versions 
      WHERE title = '001' AND user_type = 'customer'
    `);
    
    const check002 = await client.query(`
      SELECT id, language FROM policy_versions 
      WHERE title = '002' AND user_type = 'customer'
    `);
    
    if (check001.rows.length > 0) {
      await client.query(`
        UPDATE policy_versions 
        SET language = 'th'
        WHERE title = '001' AND user_type = 'customer'
      `);
      console.log('✅ Set 001 to Thai (th)');
    }
    
    if (check002.rows.length > 0) {
      await client.query(`
        UPDATE policy_versions 
        SET language = 'en'
        WHERE title = '002' AND user_type = 'customer'
      `);
      console.log('✅ Set 002 to English (en)');
    }
    
    // 3. Test API endpoints
    console.log('\n🧪 TESTING API ENDPOINTS:');
    
    try {
      // Test Thai endpoint
      const thResponse = await axios.get('http://localhost:3000/api/simple-policy/active?userType=customer&language=th');
      if (thResponse.data.success && thResponse.data.data) {
        console.log(`✅ Thai API: Returns "${thResponse.data.data.title}"`);
      } else {
        console.log('❌ Thai API: No data returned');
      }
    } catch (err) {
      console.log('❌ Thai API Error:', err.message);
    }
    
    try {
      // Test English endpoint
      const enResponse = await axios.get('http://localhost:3000/api/simple-policy/active?userType=customer&language=en');
      if (enResponse.data.success && enResponse.data.data) {
        console.log(`✅ English API: Returns "${enResponse.data.data.title}"`);
      } else {
        console.log('❌ English API: No data returned');
      }
    } catch (err) {
      console.log('❌ English API Error:', err.message);
    }
    
    // 4. Final verification
    console.log('\n📋 FINAL VERIFICATION:');
    const finalCheck = await client.query(`
      SELECT user_type, language, title, is_active
      FROM policy_versions
      WHERE user_type = 'customer' AND is_active = true
      ORDER BY language
    `);
    
    console.log('Active customer policies:');
    finalCheck.rows.forEach(row => {
      console.log(`  ${row.user_type}/${row.language}: "${row.title}" (Active: ${row.is_active})`);
    });
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ CHECK COMPLETE!\n');
    console.log('Test URLs:');
    console.log('  Thai: http://localhost:5000/consent/customer?lang=th');
    console.log('  English: http://localhost:5000/consent/customer?lang=en');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

fullCheckAndFix();
