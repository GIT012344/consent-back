const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '4321',
  database: process.env.DB_NAME || 'consent'
});

async function completeSystemFix() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Starting complete system fix...\n');
    
    // 1. Clean up database - keep only essential tables
    console.log('1. Cleaning database tables...');
    const tablesToDrop = [
      'form_fields', 'titles', 'user_types', 'simple_policy'
    ];
    
    for (const table of tablesToDrop) {
      await client.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
      console.log(`   Dropped ${table}`);
    }
    
    // 2. Ensure essential tables exist with correct structure
    console.log('\n2. Creating essential tables...');
    
    // consent_records table
    await client.query(`
      CREATE TABLE IF NOT EXISTS consent_records (
        id SERIAL PRIMARY KEY,
        title VARCHAR(10),
        name_surname VARCHAR(255) NOT NULL,
        id_passport VARCHAR(50) NOT NULL,
        created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_time TIME DEFAULT CURRENT_TIME,
        ip_address VARCHAR(45),
        browser VARCHAR(500),
        consent_type VARCHAR(50) DEFAULT 'customer',
        user_type VARCHAR(50) DEFAULT 'customer',
        consent_language VARCHAR(10) DEFAULT 'th',
        consent_version VARCHAR(20) DEFAULT '1.0',
        is_active BOOLEAN DEFAULT TRUE,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✅ consent_records table ready');
    
    // consent_history table
    await client.query(`
      CREATE TABLE IF NOT EXISTS consent_history (
        id SERIAL PRIMARY KEY,
        id_passport VARCHAR(50) NOT NULL,
        title VARCHAR(50),
        name_surname VARCHAR(255) NOT NULL,
        consent_version VARCHAR(20) NOT NULL,
        consent_version_id INTEGER,
        consent_type VARCHAR(50) DEFAULT 'customer',
        consent_language VARCHAR(10) DEFAULT 'th',
        user_type VARCHAR(50) DEFAULT 'customer',
        is_active BOOLEAN DEFAULT FALSE,
        created_date DATE DEFAULT CURRENT_DATE,
        created_time TIME DEFAULT CURRENT_TIME,
        ip_address VARCHAR(45),
        browser VARCHAR(500),
        action VARCHAR(50) DEFAULT 'consent_given',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✅ consent_history table ready');
    
    // policy_versions table for storing consent content
    await client.query(`
      CREATE TABLE IF NOT EXISTS policy_versions (
        id SERIAL PRIMARY KEY,
        version VARCHAR(50),
        title VARCHAR(500),
        content TEXT,
        language VARCHAR(10),
        user_type VARCHAR(50),
        effective_date DATE,
        expiry_date DATE,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✅ policy_versions table ready');
    
    // 3. Create indexes for performance
    console.log('\n3. Creating indexes...');
    await client.query('CREATE INDEX IF NOT EXISTS idx_consent_records_id_passport ON consent_records(id_passport)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_consent_history_id_passport ON consent_history(id_passport)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_policy_versions_active ON policy_versions(user_type, language, is_active)');
    console.log('   ✅ Indexes created');
    
    // 4. Check existing policies
    console.log('\n4. Checking existing policies...');
    const policies = await client.query(`
      SELECT user_type, language, title, is_active 
      FROM policy_versions 
      WHERE is_active = true
      ORDER BY user_type, language
    `);
    
    if (policies.rows.length > 0) {
      console.log('   Found active policies:');
      policies.rows.forEach(p => {
        console.log(`   - ${p.user_type}/${p.language}: "${p.title}"`);
      });
    } else {
      console.log('   No active policies found - creating defaults...');
      
      // Create default policies
      const defaultPolicies = [
        {
          user_type: 'customer',
          language: 'th',
          title: 'ข้อตกลงและเงื่อนไขการใช้บริการ',
          content: '<h2>ข้อตกลงและเงื่อนไขการใช้บริการ</h2><p>ยินดีต้อนรับสู่บริการของเรา</p>'
        },
        {
          user_type: 'customer',
          language: 'en',
          title: 'Terms and Conditions',
          content: '<h2>Terms and Conditions</h2><p>Welcome to our service.</p>'
        }
      ];
      
      for (const policy of defaultPolicies) {
        await client.query(
          `INSERT INTO policy_versions (version, title, content, language, user_type, is_active)
           VALUES ('1.0', $1, $2, $3, $4, true)`,
          [policy.title, policy.content, policy.language, policy.user_type]
        );
        console.log(`   Created ${policy.user_type}/${policy.language} policy`);
      }
    }
    
    // 5. Show final database state
    console.log('\n5. Final database state:');
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    console.log(`   Total tables: ${tables.rows.length}`);
    tables.rows.forEach((t, i) => {
      console.log(`   ${i + 1}. ${t.table_name}`);
    });
    
    console.log('\n✅ System fix completed successfully!');
    console.log('   - Database cleaned and optimized');
    console.log('   - All essential tables ready');
    console.log('   - Policies available for consent display');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

completeSystemFix().catch(console.error);
