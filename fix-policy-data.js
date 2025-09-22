const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '4321',
  database: process.env.DB_NAME || 'consent'
});

async function fixPolicyData() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Fixing policy data...\n');
    
    // First, update the existing wrong policy to be a proper customer/th policy
    await client.query(`
      UPDATE policy_versions 
      SET user_type = 'customer',
          language = 'th',
          title = 'ข้อตกลงและเงื่อนไขการใช้บริการ',
          content = '<h2>ข้อตกลงและเงื่อนไขการใช้บริการ</h2><p>ยินดีต้อนรับสู่บริการของเรา</p>'
      WHERE id = 1
    `);
    console.log('✅ Updated existing policy ID 1 to customer/th');
    
    // Insert sample policies for all user types and languages
    const policies = [
      {
        version: '1.0',
        title: 'Terms and Conditions',
        content: '<h2>Terms and Conditions</h2><p>Welcome to our service. Please read these terms carefully.</p><h3>1. Acceptance</h3><p>By using our service, you agree to these terms.</p>',
        language: 'en',
        user_type: 'customer'
      },
      {
        version: '1.0',
        title: 'ข้อตกลงการใช้งานสำหรับพนักงาน',
        content: '<h2>ข้อตกลงการใช้งานสำหรับพนักงาน</h2><p>ข้อตกลงนี้มีผลบังคับใช้กับพนักงานทุกคน</p><h3>1. การรักษาความลับ</h3><p>พนักงานต้องรักษาความลับของบริษัท</p>',
        language: 'th',
        user_type: 'employee'
      },
      {
        version: '1.0',
        title: 'Employee Agreement',
        content: '<h2>Employee Agreement</h2><p>This agreement applies to all employees.</p><h3>1. Confidentiality</h3><p>Employees must maintain company confidentiality.</p>',
        language: 'en',
        user_type: 'employee'
      },
      {
        version: '1.0',
        title: 'ข้อตกลงพันธมิตรทางธุรกิจ',
        content: '<h2>ข้อตกลงพันธมิตรทางธุรกิจ</h2><p>ข้อตกลงความร่วมมือระหว่างพันธมิตร</p><h3>1. ความร่วมมือ</h3><p>ทั้งสองฝ่ายตกลงร่วมมือกัน</p>',
        language: 'th',
        user_type: 'partner'
      },
      {
        version: '1.0',
        title: 'Business Partner Agreement',
        content: '<h2>Business Partner Agreement</h2><p>Partnership agreement between parties.</p><h3>1. Cooperation</h3><p>Both parties agree to cooperate.</p>',
        language: 'en',
        user_type: 'partner'
      }
    ];
    
    for (const policy of policies) {
      // Check if this combination already exists
      const existing = await client.query(
        'SELECT id FROM policy_versions WHERE user_type = $1 AND language = $2',
        [policy.user_type, policy.language]
      );
      
      if (existing.rows.length === 0) {
        await client.query(
          `INSERT INTO policy_versions (version, title, content, language, user_type, is_active)
           VALUES ($1, $2, $3, $4, $5, true)`,
          [policy.version, policy.title, policy.content, policy.language, policy.user_type]
        );
        console.log(`✅ Created ${policy.user_type}/${policy.language} policy`);
      } else {
        console.log(`⏭️  ${policy.user_type}/${policy.language} already exists`);
      }
    }
    
    // Show final state
    console.log('\n📊 Final policy state:');
    const result = await client.query(`
      SELECT user_type, language, title, is_active 
      FROM policy_versions 
      ORDER BY user_type, language
    `);
    
    result.rows.forEach(row => {
      console.log(`  ${row.user_type}/${row.language}: "${row.title}" (Active: ${row.is_active ? '✅' : '❌'})`);
    });
    
    console.log('\n✅ Policy data fixed successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

fixPolicyData();
