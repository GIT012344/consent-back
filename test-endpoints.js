const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';

async function testAPIs() {
  console.log('🧪 Testing Consent Management APIs...\n');
  
  const tests = [
    {
      name: 'Check Consent Version',
      method: 'GET',
      url: `${API_BASE}/consent/active-version/customer/th`
    },
    {
      name: 'Get Consent Stats',
      method: 'GET',
      url: `${API_BASE}/consent/stats`
    },
    {
      name: 'List Consents',
      method: 'GET',
      url: `${API_BASE}/consent/list?page=1&limit=10`
    },
    {
      name: 'Get Form Templates',
      method: 'GET',
      url: `${API_BASE}/form-templates`
    },
    {
      name: 'Get Upload Versions',
      method: 'GET',
      url: `${API_BASE}/upload/consent-versions?active=true`
    }
  ];
  
  for (const test of tests) {
    try {
      console.log(`📍 Testing: ${test.name}`);
      console.log(`   ${test.method} ${test.url}`);
      
      const response = await axios({
        method: test.method,
        url: test.url,
        validateStatus: () => true
      });
      
      if (response.status === 200) {
        console.log(`   ✅ Success: ${response.status}`);
        if (response.data) {
          console.log(`   📊 Data:`, JSON.stringify(response.data).substring(0, 100) + '...');
        }
      } else {
        console.log(`   ❌ Failed: ${response.status} - ${response.statusText}`);
        if (response.data?.message) {
          console.log(`   💬 Message: ${response.data.message}`);
        }
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
    console.log('');
  }
  
  console.log('✅ API Testing Complete!');
}

// Wait for server to start
console.log('⏳ Waiting for server to start...');
setTimeout(() => {
  testAPIs().catch(console.error);
}, 2000);
