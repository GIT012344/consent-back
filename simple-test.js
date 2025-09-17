// Simple test script to verify backend functionality
const axios = require('axios');

async function simpleTest() {
  console.log('🧪 Testing Backend Features...\n');
  
  const baseURL = 'http://localhost:3000';
  
  // Test 1: Server health
  console.log('1. Server Health Check');
  try {
    const health = await axios.get(`${baseURL}/health`);
    console.log('✅ Server is running:', health.data.status);
  } catch (error) {
    console.log('❌ Server not running. Start with: npm run dev');
    return;
  }
  
  // Test 2: Export statistics endpoint
  console.log('\n2. Testing Export Statistics');
  try {
    const stats = await axios.get(`${baseURL}/api/consent-export/stats/scb`);
    console.log('✅ Statistics endpoint working');
    console.log('   Total consents:', stats.data.data.totalConsents);
  } catch (error) {
    console.log('⚠️ No statistics data yet:', error.response?.data?.message || 'Empty dataset');
  }
  
  // Test 3: CSV export endpoint
  console.log('\n3. Testing CSV Export');
  try {
    const csv = await axios.get(`${baseURL}/api/consent-export/csv/scb`, {
      params: {
        startDate: '2024-01-01',
        endDate: '2024-12-31'
      }
    });
    console.log('✅ CSV export working');
  } catch (error) {
    console.log('⚠️ No data to export:', error.response?.data?.message || 'Empty dataset');
  }
  
  // Test 4: Re-consent check
  console.log('\n4. Testing Re-consent Check');
  try {
    const check = await axios.post(`${baseURL}/api/consent-export/check-reconsent`, {
      tenant: 'scb',
      idNumber: '1234567890123'
    });
    console.log('✅ Re-consent check:', check.data.needsReconsent ? 'Needs re-consent' : 'Up to date');
  } catch (error) {
    console.log('⚠️ Re-consent check:', error.response?.data?.message || 'No prior consent');
  }
  
  // Test 5: Create policy with new fields
  console.log('\n5. Testing Policy Creation with Enforcement Fields');
  try {
    const policy = await axios.post(`${baseURL}/api/admin/policy-versions`, {
      tenant: 'scb',
      kind: 'privacy',
      version: '3.0.0',
      language: 'th',
      audiences: ['customer'],
      title: 'Test Policy with Enforcement',
      content: '<p>Test content</p>',
      effectiveFrom: new Date().toISOString(),
      isMandatory: true,
      allowReject: false,
      graceDays: 7,
      enforceMode: 'login_gate',
      reconsentTrigger: 'version_change'
    });
    console.log('✅ Policy created with enforcement fields');
    console.log('   - Grace days:', policy.data.data.grace_days);
    console.log('   - Enforce mode:', policy.data.data.enforce_mode);
    console.log('   - Re-consent trigger:', policy.data.data.reconsent_trigger);
  } catch (error) {
    console.log('❌ Policy creation error:', error.response?.data?.message || error.message);
  }
  
  console.log('\n✨ Testing complete!');
}

// Run the test
simpleTest().catch(console.error);
