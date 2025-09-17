const axios = require('axios');

const BASE_URL = 'http://localhost:4000/api';

async function testAPIs() {
  console.log('🧪 Testing Backend APIs...\n');
  
  // Test 1: Check server health
  try {
    const health = await axios.get('http://localhost:4000/health');
    console.log('✅ Server Health:', health.data);
  } catch (error) {
    console.log('❌ Server Health Failed:', error.message);
  }
  
  // Test 2: List policies
  try {
    const policies = await axios.get(`${BASE_URL}/simple-policy/list`);
    console.log('✅ List Policies:', policies.data.success ? `Found ${policies.data.data.length} policies` : 'Failed');
  } catch (error) {
    console.log('❌ List Policies Failed:', error.response?.data || error.message);
  }
  
  // Test 3: Get active policy
  try {
    const active = await axios.get(`${BASE_URL}/simple-policy/active?userType=customer&language=th-TH`);
    console.log('✅ Active Policy:', active.data.success ? 'Found' : 'Not found');
  } catch (error) {
    console.log('❌ Active Policy Failed:', error.response?.status === 404 ? 'No active policy (expected)' : error.message);
  }
  
  // Test 4: Create a test policy
  try {
    const newPolicy = await axios.post(`${BASE_URL}/simple-policy`, {
      tenant_code: 'default',
      version: '1.0.0',
      language: 'th-TH',
      userType: 'customer',
      title: 'Test Privacy Policy',
      content: '<h1>นโยบายความเป็นส่วนตัว</h1><p>ทดสอบระบบ</p>',
      effective_date: new Date().toISOString().split('T')[0],
      is_mandatory: true,
      enforce_mode: 'strict'
    });
    console.log('✅ Create Policy:', newPolicy.data.success ? 'Created successfully' : 'Failed');
    
    // Now test active policy again
    const activeAfter = await axios.get(`${BASE_URL}/simple-policy/active?userType=customer&language=th-TH`);
    console.log('✅ Active Policy After Create:', activeAfter.data.success ? 'Found' : 'Not found');
  } catch (error) {
    console.log('❌ Create Policy Failed:', error.response?.data || error.message);
  }
  
  console.log('\n✨ API Testing Complete!');
}

// Run tests
setTimeout(() => {
  testAPIs().catch(console.error);
}, 1000);
