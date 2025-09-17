const http = require('http');

// Test consent/records endpoint
http.get('http://localhost:3000/api/consent/records', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const result = JSON.parse(data);
    console.log('=== Consent Records API ===');
    console.log('Success:', result.success);
    console.log('Total records:', result.pagination?.total || result.total || 0);
    console.log('Data count:', result.data?.length || 0);
    if (result.data && result.data.length > 0) {
      console.log('First record:', result.data[0]);
    }
  });
}).on('error', (err) => {
  console.error('Error calling API:', err.message);
});

// Test simple-policy endpoint
http.get('http://localhost:3000/api/simple-policy', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const result = JSON.parse(data);
    console.log('\n=== Simple Policy API ===');
    console.log('Success:', result.success);
    console.log('Total policies:', result.data?.length || 0);
    if (result.data && result.data.length > 0) {
      console.log('Active policies:', result.data.filter(p => p.is_active).length);
    }
  });
}).on('error', (err) => {
  console.error('Error calling API:', err.message);
});

// Test admin stats endpoint
http.get('http://localhost:3000/api/admin/dashboard/stats', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const result = JSON.parse(data);
    console.log('\n=== Admin Stats API ===');
    console.log('Success:', result.success);
    if (result.data) {
      console.log('Stats:', result.data);
    }
  });
}).on('error', (err) => {
  console.error('Error calling API:', err.message);
});
