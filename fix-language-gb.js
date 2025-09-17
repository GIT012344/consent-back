const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'consent',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '4321'
});

async function fixLanguageGB() {
  const client = await pool.connect();
  
  try {
    console.log('Starting to fix language codes from GB to EN...\n');
    
    await client.query('BEGIN');
    
    // Fix consent_records table
    const result1 = await client.query(`
      UPDATE consent_records 
      SET consent_language = 'en' 
      WHERE LOWER(consent_language) = 'gb'
      RETURNING consent_id, name_surname
    `);
    console.log(`✅ Updated ${result1.rowCount} records in consent_records`);
    if (result1.rowCount > 0) {
      console.log('   Updated records:', result1.rows.map(r => r.consent_id).join(', '));
    }
    
    // Fix consent_history table if exists
    try {
      const result2 = await client.query(`
        UPDATE consent_history 
        SET consent_language = 'en' 
        WHERE LOWER(consent_language) = 'gb'
        RETURNING consent_id
      `);
      console.log(`✅ Updated ${result2.rowCount} records in consent_history`);
    } catch (err) {
      console.log('⚠️  consent_history table not found or no GB records');
    }
    
    // Fix consent_versions table
    const result3 = await client.query(`
      UPDATE consent_versions 
      SET language = 'en' 
      WHERE LOWER(language) = 'gb'
      RETURNING id, title
    `);
    console.log(`✅ Updated ${result3.rowCount} records in consent_versions`);
    if (result3.rowCount > 0) {
      console.log('   Updated versions:', result3.rows.map(r => r.title).join(', '));
    }
    
    // Fix policy_versions table if exists
    try {
      const result4 = await client.query(`
        UPDATE policy_versions 
        SET language = 'en' 
        WHERE LOWER(language) = 'gb'
        RETURNING id
      `);
      console.log(`✅ Updated ${result4.rowCount} records in policy_versions`);
    } catch (err) {
      console.log('⚠️  policy_versions table not found or no GB records');
    }
    
    // Check for any remaining GB values
    console.log('\n📊 Checking for any remaining GB values...');
    
    const check1 = await client.query(`
      SELECT COUNT(*) as count 
      FROM consent_records 
      WHERE LOWER(consent_language) = 'gb'
    `);
    console.log(`   consent_records with GB: ${check1.rows[0].count}`);
    
    const check2 = await client.query(`
      SELECT COUNT(*) as count 
      FROM consent_versions 
      WHERE LOWER(language) = 'gb'
    `);
    console.log(`   consent_versions with GB: ${check2.rows[0].count}`);
    
    await client.query('COMMIT');
    console.log('\n✅ Successfully fixed all language codes from GB to EN!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error fixing language codes:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the fix
fixLanguageGB().catch(console.error);
