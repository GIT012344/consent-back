const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '4321',
  database: 'consent'
});

async function addPolicyIdColumn() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Adding policy_id column to consent_records table\n');
    console.log('='.repeat(80));
    
    // 1. Check if column exists
    const checkColumn = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'consent_records' 
      AND column_name = 'policy_id'
    `);
    
    if (checkColumn.rows.length === 0) {
      // 2. Add policy_id column
      console.log('Adding policy_id column...');
      await client.query(`
        ALTER TABLE consent_records 
        ADD COLUMN policy_id INTEGER
      `);
      console.log('✅ policy_id column added');
      
      // 3. Update existing records with policy_id based on user_type, language, and title
      console.log('\nUpdating existing records with policy_id...');
      const updateQuery = `
        UPDATE consent_records cr
        SET policy_id = pv.id
        FROM policy_versions pv
        WHERE cr.user_type = pv.user_type
          AND cr.consent_language = pv.language
          AND cr.policy_title = pv.title
          AND cr.policy_id IS NULL
      `;
      
      const result = await client.query(updateQuery);
      console.log(`✅ Updated ${result.rowCount} records with policy_id`);
      
    } else {
      console.log('ℹ️ policy_id column already exists');
    }
    
    // 4. Show sample data
    console.log('\n📊 Sample consent records with policy_id:');
    const sample = await client.query(`
      SELECT id, name_surname, user_type, policy_title, policy_id, consent_language
      FROM consent_records
      WHERE is_active = true
      ORDER BY created_date DESC
      LIMIT 5
    `);
    
    sample.rows.forEach(r => {
      console.log(`ID ${r.id}: ${r.name_surname}`);
      console.log(`   User Type: ${r.user_type}`);
      console.log(`   Policy Title: ${r.policy_title}`);
      console.log(`   Policy ID: ${r.policy_id || 'NULL'}`);
      console.log('');
    });
    
    console.log('='.repeat(80));
    console.log('\n✅ Database ready for policy_id tracking!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

addPolicyIdColumn();
