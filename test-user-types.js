const axios = require('axios');

const API_URL = 'http://localhost:3000';

// Test data for different user types
const testCases = [
  {
    userType: 'customer',
    language: 'th',
    data: {
      name: 'ทดสอบ',
      surname: 'ลูกค้า',
      nameSurname: 'ทดสอบ ลูกค้า',
      idPassport: '1234567890123',
      email: 'customer@test.com',
      phone: '0812345678',
      userType: 'customer',
      consentVersion: '1.0.0',
      language: 'th',
      consentGiven: true,
      consentDate: new Date().toISOString()
    }
  },
  {
    userType: 'employee',
    language: 'en',
    data: {
      name: 'Test',
      surname: 'Employee',
      nameSurname: 'Test Employee',
      idPassport: '9876543210987',
      email: 'employee@company.com',
      phone: '0898765432',
      userType: 'employee',
      consentVersion: '1.0.0',
      language: 'en',
      consentGiven: true,
      consentDate: new Date().toISOString()
    }
  },
  {
    userType: 'partner',
    language: 'th',
    data: {
      name: 'พาร์ทเนอร์',
      surname: 'ทดสอบ',
      nameSurname: 'พาร์ทเนอร์ ทดสอบ',
      idPassport: '5555555555555',
      email: 'partner@business.com',
      phone: '0856789012',
      userType: 'partner',
      consentVersion: '1.0.0',
      language: 'th',
      consentGiven: true,
      consentDate: new Date().toISOString()
    }
  }
];

async function testUserTypes() {
  console.log('Testing consent submission for different user types...\n');
  
  for (const testCase of testCases) {
    console.log(`\n=== Testing ${testCase.userType.toUpperCase()} (${testCase.language}) ===`);
    
    try {
      // Submit consent
      const response = await axios.post(`${API_URL}/api/consent`, testCase.data);
      
      if (response.data.success) {
        console.log(`✅ ${testCase.userType} consent submitted successfully`);
        console.log(`   ID: ${response.data.data.id}`);
        console.log(`   User Type: ${response.data.data.user_type}`);
        console.log(`   Language: ${response.data.data.consent_language}`);
      } else {
        console.log(`❌ ${testCase.userType} submission failed:`, response.data.message);
      }
    } catch (error) {
      if (error.response) {
        console.log(`❌ ${testCase.userType} error:`, error.response.data.message || error.response.data.error);
      } else {
        console.log(`❌ ${testCase.userType} network error:`, error.message);
      }
    }
  }
  
  // Test fetching recent consents
  console.log('\n\n=== Testing Admin Dashboard Recent Consents ===');
  try {
    const response = await axios.get(`${API_URL}/api/admin/dashboard/recent?limit=10`);
    console.log(`✅ Fetched ${response.data.data.consents.length} recent consents`);
    
    // Group by user type
    const byUserType = {};
    response.data.data.consents.forEach(consent => {
      const type = consent.user_type || 'unknown';
      byUserType[type] = (byUserType[type] || 0) + 1;
    });
    
    console.log('\nConsents by User Type:');
    Object.entries(byUserType).forEach(([type, count]) => {
      console.log(`   ${type}: ${count}`);
    });
    
  } catch (error) {
    console.log('❌ Failed to fetch recent consents:', error.response?.data?.error || error.message);
  }
  
  // Test dashboard stats
  console.log('\n=== Testing Dashboard Stats ===');
  try {
    const response = await axios.get(`${API_URL}/api/admin/dashboard/stats`);
    console.log(`✅ Dashboard stats fetched successfully`);
    console.log(`   Total consents: ${response.data.data.total}`);
    console.log(`   Today: ${response.data.data.today}`);
    console.log('\n   By User Type:');
    response.data.data.byAudience.forEach(item => {
      console.log(`   - ${item.audience}: ${item.count}`);
    });
  } catch (error) {
    console.log('❌ Failed to fetch stats:', error.response?.data?.error || error.message);
  }
}

// Run tests
testUserTypes().catch(console.error);
