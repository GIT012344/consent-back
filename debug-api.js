const pool = require('./db');
const http = require('http');

async function debugAPI() {
  console.log('=== DEBUG API ISSUE ===\n');
  
  // 1. Check database directly
  try {
    const result = await pool.query('SELECT id, name_surname, id_passport, user_type, created_date FROM consent_records ORDER BY id DESC LIMIT 5');
    console.log('📊 Database has', result.rows.length, 'records:');
    result.rows.forEach(r => {
      console.log(`  - ID ${r.id}: ${r.name_surname} (${r.user_type}) - ${r.created_date}`);
    });
  } catch (err) {
    console.error('DB Error:', err.message);
  }
  
  // 2. Test API endpoint
  console.log('\n📡 Testing API /api/consent/records...');
  
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/consent/records',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  };
  
  const req = http.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('Status:', res.statusCode);
      
      try {
        const json = JSON.parse(data);
        console.log('Success:', json.success);
        console.log('Data count:', json.data?.length || 0);
        console.log('Pagination total:', json.pagination?.total || 0);
        
        if (json.error) {
          console.log('❌ API Error:', json.error);
        }
        
        if (json.data && json.data.length > 0) {
          console.log('\n✅ API returned data:');
          console.log('First record:', json.data[0]);
        } else {
          console.log('\n❌ API returned empty data array');
        }
      } catch (e) {
        console.error('Parse error:', e.message);
        console.log('Raw response:', data);
      }
      
      pool.end();
    });
  });
  
  req.on('error', (e) => {
    console.error('Request error:', e.message);
    pool.end();
  });
  
  req.end();
}

debugAPI();
