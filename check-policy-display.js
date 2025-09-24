const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '4321',
  database: process.env.DB_NAME || 'consent'
});

async function checkPolicyDisplay() {
  const client = await pool.connect();
  
  try {
    console.log('📊 ตรวจสอบเนื้อหา Policy ในฐานข้อมูล\n');
    console.log('='.repeat(50));
    
    const result = await client.query(`
      SELECT id, user_type, language, title, 
             LEFT(content, 200) as content_preview,
             is_active, created_at
      FROM policy_versions
      WHERE is_active = true
      ORDER BY user_type, language
    `);
    
    if (result.rows.length === 0) {
      console.log('❌ ไม่พบ Policy ที่ Active ในฐานข้อมูล!');
    } else {
      console.log(`✅ พบ ${result.rows.length} Policies:\n`);
      
      result.rows.forEach((policy, index) => {
        console.log(`${index + 1}. ${policy.user_type}/${policy.language}`);
        console.log(`   Title: "${policy.title}"`);
        console.log(`   Content: ${policy.content_preview}`);
        console.log(`   Created: ${new Date(policy.created_at).toLocaleString('th-TH')}`);
        console.log('');
      });
    }
    
    console.log('='.repeat(50));
    console.log('\n🔗 ลิงค์ทดสอบ (Port 5000):');
    console.log('   Customer TH: http://localhost:5000/consent/customer?lang=th');
    console.log('   Customer EN: http://localhost:5000/consent/customer?lang=en');
    console.log('   Admin Panel: http://localhost:5000/admin/login');
    console.log('   Create Policy: http://localhost:5000/admin/create-policy');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

checkPolicyDisplay();
