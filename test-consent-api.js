const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'consent',
  user: 'postgres',
  password: '4321'
});

async function testConsentData() {
  try {
    // Check if consent_records table has data
    const result = await pool.query('SELECT * FROM consent_records LIMIT 10');
    console.log('=== Consent Records in Database ===');
    console.log('Total records found:', result.rows.length);
    
    if (result.rows.length > 0) {
      console.log('\nSample data:');
      result.rows.forEach((row, index) => {
        console.log(`\nRecord ${index + 1}:`);
        console.log('  ID:', row.id);
        console.log('  Name:', row.name_surname);
        console.log('  ID/Passport:', row.id_passport);
        console.log('  User Type:', row.user_type);
        console.log('  Created:', row.created_date || row.created_at);
      });
    } else {
      console.log('\n❌ No consent records in database!');
      console.log('Please create some consent records first:');
      console.log('1. Go to http://localhost:3003/consent/customer');
      console.log('2. Fill in the consent form');
      console.log('3. Submit the form');
    }
    
    // Check table structure
    const columns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'consent_records'
      ORDER BY ordinal_position
    `);
    
    console.log('\n=== Table Structure ===');
    console.log('Columns:', columns.rows.map(c => c.column_name).join(', '));
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

testConsentData();
