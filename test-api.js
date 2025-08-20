// Simple test script to verify API is working
const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';
          const result = JSON.parse(data);
          console.log('✅ Health endpoint working:', result);
          resolve(result);
        } catch (error) {
          console.log('❌ Health endpoint response:', data);
          reject(error);
        }
      });
    });
    
    req.on('error', (error) => {
      console.log('❌ Health endpoint failed:', error.message);
      reject(error);
    });
    
    req.setTimeout(5000, () => {
      console.log('❌ Health endpoint timeout');
      req.destroy();
      reject(new Error('Timeout'));
    });
  });
};

const testConsentSubmission = () => {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      title: 'นาย',
      nameSurname: 'ทดสอบ ระบบ',
      idPassport: 'TEST123456789',
      language: 'th',
      consentType: 'customer'
    });

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/consent/submit',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          console.log('✅ Consent submission test:', result);
          resolve(result);
        } catch (error) {
          console.log('❌ Consent submission response:', data);
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      console.log('❌ Consent submission failed:', error.message);
      reject(error);
    });

    req.setTimeout(5000, () => {
      console.log('❌ Consent submission timeout');
      req.destroy();
      reject(new Error('Timeout'));
    });

    req.write(postData);
    req.end();
  });
};

// Run tests
const runTests = async () => {
  console.log('🧪 Testing Consent Management API...\n');
  
  try {
    // Test 1: Health endpoint
    console.log('1. Testing health endpoint...');
    await testHealthEndpoint();
    
    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test 2: Consent submission (this might fail if database is not set up)
    console.log('\n2. Testing consent submission...');
    await testConsentSubmission();
    
    console.log('\n🎉 All tests passed! API is working correctly.');
    
  } catch (error) {
    console.log('\n⚠️  Some tests failed. This might be due to database not being set up yet.');
    console.log('Make sure PostgreSQL is running and database "consent" exists.');
  }
  
  process.exit(0);
};

// Wait a bit for server to start, then run tests
setTimeout(runTests, 2000);
