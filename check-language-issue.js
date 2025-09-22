const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '4321',
  database: process.env.DB_NAME || 'consent'
});

async function checkLanguageIssue() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 ตรวจสอบปัญหาภาษา\n');
    console.log('='.repeat(50));
    
    // 1. Check what's in database
    console.log('📊 เนื้อหาในฐานข้อมูล:');
    const policies = await client.query(`
      SELECT id, user_type, language, title, 
             LEFT(content, 100) as content_preview
      FROM policy_versions
      WHERE user_type = 'customer' AND is_active = true
      ORDER BY language
    `);
    
    policies.rows.forEach(p => {
      console.log(`\nID: ${p.id}`);
      console.log(`User Type: ${p.user_type}`);
      console.log(`Language: ${p.language}`);
      console.log(`Title: ${p.title}`);
      console.log(`Content: ${p.content_preview}...`);
    });
    
    // 2. Test API calls
    console.log('\n' + '='.repeat(50));
    console.log('🧪 ทดสอบ API:\n');
    
    const axios = require('axios');
    
    // Test Thai
    try {
      const thResponse = await axios.get('http://localhost:3000/api/simple-policy/active?userType=customer&language=th');
      console.log('Thai API Response:');
      console.log(`  Title: ${thResponse.data.data?.title}`);
      console.log(`  Language: ${thResponse.data.data?.language}`);
    } catch (err) {
      console.log('Thai API Error:', err.message);
    }
    
    // Test English
    try {
      const enResponse = await axios.get('http://localhost:3000/api/simple-policy/active?userType=customer&language=en');
      console.log('\nEnglish API Response:');
      console.log(`  Title: ${enResponse.data.data?.title}`);
      console.log(`  Language: ${enResponse.data.data?.language}`);
    } catch (err) {
      console.log('English API Error:', err.message);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

checkLanguageIssue();
