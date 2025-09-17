const pool = require('./db');
const http = require('http');

async function fixAndTest() {
  console.log('=== FIXING API ISSUE ===\n');
  
  // 1. Check what columns actually exist
  const columns = await pool.query(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'consent_records'
    ORDER BY ordinal_position
  `);
  
  console.log('📋 Columns in consent_records:');
  console.log(columns.rows.map(c => c.column_name).join(', '));
  
  // 2. Check data in database
  const data = await pool.query('SELECT * FROM consent_records ORDER BY id DESC LIMIT 3');
  console.log('\n📊 Database has', data.rows.length, 'records');
  if (data.rows.length > 0) {
    console.log('Sample:', data.rows[0]);
  }
  
  // 3. Test API
  console.log('\n📡 Testing API...');
  
  const req = http.request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/consent/records',
    method: 'GET'
  }, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
      const json = JSON.parse(body);
      console.log('API Response:');
      console.log('- Success:', json.success);
      console.log('- Data count:', json.data?.length || 0);
      console.log('- Total:', json.pagination?.total || 0);
      if (json.error) console.log('- Error:', json.error);
      
      if (json.data && json.data.length > 0) {
        console.log('\n✅ API Working! First record:');
        console.log(json.data[0]);
      } else {
        console.log('\n❌ No data from API');
      }
      
      pool.end();
    });
  });
  
  req.on('error', e => {
    console.error('Request failed:', e.message);
    pool.end();
  });
  
  req.end();
}

fixAndTest();
