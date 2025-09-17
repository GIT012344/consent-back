const axios = require('axios');

async function testConsentAPI() {
  console.log('🧪 Testing Consent API...\n');
  
  // Test 1: Check server health
  try {
    const health = await axios.get('http://localhost:3000/health');
    console.log('✅ Server Health:', health.data);
  } catch (error) {
    console.log('❌ Server not running on port 3000');
    console.log('   Please run: node simple-consent-server.js');
    return;
  }
  
  // Test 2: Submit consent with correct format
  try {
    const payload = {
      name: 'John',
      surname: 'Doe',
      idPassport: '1234567890123',
      email: 'john@example.com',
      phone: '0812345678',
      userType: 'customer',
      consentVersion: '1.0',
      language: 'th',
      policyTitle: 'Privacy Policy',
      policyVersion: '1.0',
      browser: 'Chrome',
      userAgent: 'Mozilla/5.0 Test'
    };
    
    console.log('📤 Sending payload:', payload);
    
    const response = await axios.post('http://localhost:3000/api/consent', payload);
    console.log('✅ Consent submitted:', response.data);
  } catch (error) {
    console.log('❌ Consent submission failed:');
    if (error.response) {
      console.log('   Status:', error.response.status);
      console.log('   Data:', error.response.data);
    } else {
      console.log('   Error:', error.message);
    }
  }
  
  // Test 3: List consents
  try {
    const list = await axios.get('http://localhost:3000/api/consent/list');
    console.log('✅ Consent list:', list.data.data?.length || 0, 'records');
  } catch (error) {
    console.log('❌ List consents failed:', error.message);
  }
}

testConsentAPI().catch(console.error);
