const http = require('http');

// Test API directly
const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/consent/records',
  method: 'GET'
};

const req = http.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Status Code:', res.statusCode);
    console.log('Response:');
    const json = JSON.parse(data);
    console.log(JSON.stringify(json, null, 2));
    
    if (json.data && json.data.length > 0) {
      console.log('\n✅ Found', json.data.length, 'records');
      console.log('\nFirst record:');
      console.log(json.data[0]);
    } else {
      console.log('\n❌ No data returned from API');
    }
  });
});

req.on('error', (e) => {
  console.error('Error:', e.message);
});

req.end();
