const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '4321',
  database: 'consent'
});

async function directDbFix() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Direct Database Fix\n');
    console.log('='.repeat(80));
    
    // Clear all old policies
    await client.query('DELETE FROM policy_versions');
    console.log('✅ Cleared all old policies');
    
    // Create new policy for customer/th
    await client.query(`
      INSERT INTO policy_versions (
        title,
        user_type,
        language,
        version,
        content,
        is_active,
        created_at,
        updated_at
      ) VALUES (
        '001',
        'customer',
        'th',
        '1.0.0',
        '<h1>นโยบายความเป็นส่วนตัว</h1><p>นโยบายเลือกข้อหาม</p><p>ผลิตภัณฑ์นี้ความเอาผา</p><p>อำพลสนุยมความยอมพใจ</p>',
        true,
        NOW(),
        NOW()
      )
    `);
    console.log('✅ Created customer/th policy');
    
    // Create policy for customer/en
    await client.query(`
      INSERT INTO policy_versions (
        title,
        user_type,
        language,
        version,
        content,
        is_active,
        created_at,
        updated_at
      ) VALUES (
        '002',
        'customer',
        'en',
        '1.0.0',
        '<h1>Privacy Policy</h1><p>English content</p>',
        true,
        NOW(),
        NOW()
      )
    `);
    console.log('✅ Created customer/en policy');
    
    // Verify
    const verify = await client.query(`
      SELECT user_type, language, title, is_active
      FROM policy_versions
      WHERE is_active = true
    `);
    
    console.log('\n✅ Policies in database:');
    verify.rows.forEach(p => {
      console.log(`   ${p.user_type}/${p.language}: "${p.title}"`);
    });
    
    console.log('\n✅ Done! Test at:');
    console.log('http://localhost:5000/consent/customer?lang=th');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

directDbFix();
