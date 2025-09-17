const axios = require('axios');

async function testAPI() {
  try {
    // Test GET endpoint
    console.log('Testing GET /api/simple-policy...');
    const getResponse = await axios.get('http://localhost:3000/api/simple-policy');
    console.log('GET Response:', getResponse.data);
    
    // Test POST endpoint
    console.log('\nTesting POST /api/simple-policy...');
    const postData = {
      version: '1.0',
      language: 'th-TH',
      userType: 'customer',
      title: 'นโยบายความเป็นส่วนตัว',
      content: 'เนื้อหานโยบายทดสอบ',
      effective_date: new Date().toISOString().split('T')[0]
    };
    
    const postResponse = await axios.post('http://localhost:3000/api/simple-policy', postData);
    console.log('POST Response:', postResponse.data);
    
  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
  }
}

testAPI();
