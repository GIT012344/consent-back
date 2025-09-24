const axios = require('axios');

async function testApiDirectly() {
  console.log('🔍 ทดสอบ API โดยตรง\n');
  console.log('='.repeat(80));
  
  const url = 'http://localhost:3000/api/simple-policy/active?userType=customer&language=th';
  
  console.log(`Testing: ${url}\n`);
  
  try {
    const response = await axios.get(url);
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2));
    
    if (response.data.success && response.data.data) {
      console.log('\n✅ API พบ Policy:');
      console.log(`Title: ${response.data.data.title}`);
      console.log(`Content: ${response.data.data.content}`);
    } else {
      console.log('\n❌ API ไม่พบ Policy');
      console.log('Message:', response.data.message);
    }
  } catch (error) {
    console.log('❌ API Error:', error.message);
    if (error.response) {
      console.log('Response:', error.response.data);
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('\nถ้า API ไม่พบ Policy:');
  console.log('1. ตรวจสอบว่า backend ทำงานอยู่ (npm run dev)');
  console.log('2. ตรวจสอบว่ามี policy ในฐานข้อมูล');
  console.log('3. ตรวจสอบว่า language และ userType ตรงกัน');
}

testApiDirectly();
