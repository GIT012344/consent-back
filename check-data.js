const pool = require('./db');

async function checkData() {
  try {
    console.log('Checking database...');
    
    // Check consent_records
    const records = await pool.query('SELECT * FROM consent_records');
    console.log('\n=== CONSENT RECORDS ===');
    console.log('Total records:', records.rows.length);
    
    if (records.rows.length > 0) {
      console.log('\nData found:');
      records.rows.forEach(r => {
        console.log(`- ${r.name_surname || 'No name'} (${r.user_type || 'customer'}) - ${r.created_date || r.created_at || 'No date'}`);
      });
    } else {
      console.log('❌ No records in database!');
    }
    
    // Test API endpoint
    const http = require('http');
    http.get('http://localhost:3000/api/consent/records', res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('\n=== API RESPONSE ===');
        const json = JSON.parse(data);
        console.log('Success:', json.success);
        console.log('Data count:', json.data?.length || 0);
        if (json.pagination) {
          console.log('Total from pagination:', json.pagination.total);
        }
        pool.end();
      });
    }).on('error', err => {
      console.error('API Error:', err.message);
      pool.end();
    });
    
  } catch (error) {
    console.error('Database Error:', error.message);
    pool.end();
  }
}

checkData();
