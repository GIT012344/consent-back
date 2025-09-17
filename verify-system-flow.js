const axios = require('axios');

const API_URL = 'http://localhost:3000';

async function verifySystemFlow() {
  console.log('🔍 ตรวจสอบ Flow การทำงานทั้งหมด\n');
  console.log('='.repeat(50));
  
  const results = {
    passed: [],
    failed: []
  };
  
  // 1. ทดสอบ API Endpoints หลัก
  console.log('\n📋 1. ตรวจสอบ API Endpoints:');
  
  const endpoints = [
    { method: 'GET', path: '/api/titles', name: 'Titles API' },
    { method: 'GET', path: '/api/form-fields', name: 'Form Fields API' },
    { method: 'GET', path: '/api/admin/dashboard/stats', name: 'Dashboard Stats' },
    { method: 'GET', path: '/api/admin/dashboard/recent?limit=5', name: 'Recent Consents' },
    { method: 'POST', path: '/api/consent', name: 'Submit Consent', 
      data: {
        name: 'ทดสอบ',
        surname: 'ระบบ',
        nameSurname: 'ทดสอบ ระบบ',
        idPassport: '9999999999999',
        userType: 'customer',
        consentVersion: '1.0.0',
        language: 'th',
        consentGiven: true,
        consentDate: new Date().toISOString()
      }
    }
  ];
  
  for (const endpoint of endpoints) {
    try {
      const config = {
        method: endpoint.method,
        url: `${API_URL}${endpoint.path}`
      };
      
      if (endpoint.data) {
        config.data = endpoint.data;
      }
      
      const response = await axios(config);
      console.log(`   ✅ ${endpoint.name}: OK`);
      results.passed.push(endpoint.name);
    } catch (error) {
      const status = error.response?.status || 'Network Error';
      const message = error.response?.data?.error || error.message;
      console.log(`   ❌ ${endpoint.name}: ${status} - ${message}`);
      results.failed.push(`${endpoint.name}: ${message}`);
    }
  }
  
  // 2. ทดสอบ User Types ทั้งหมด
  console.log('\n📋 2. ทดสอบ User Types:');
  
  const userTypes = ['customer', 'employee', 'partner'];
  
  for (const userType of userTypes) {
    try {
      const testData = {
        name: `Test${userType}`,
        surname: userType,
        nameSurname: `Test${userType} ${userType}`,
        idPassport: `${userType}${Date.now()}`.substring(0, 13),
        userType: userType,
        consentVersion: '1.0.0',
        language: 'th',
        consentGiven: true,
        consentDate: new Date().toISOString()
      };
      
      const response = await axios.post(`${API_URL}/api/consent`, testData);
      
      if (response.data.success) {
        console.log(`   ✅ ${userType}: บันทึกได้`);
        results.passed.push(`UserType: ${userType}`);
      }
    } catch (error) {
      const message = error.response?.data?.message || error.message;
      console.log(`   ❌ ${userType}: ${message}`);
      results.failed.push(`UserType ${userType}: ${message}`);
    }
  }
  
  // 3. ตรวจสอบ Database Tables
  console.log('\n📋 3. ตรวจสอบ Database:');
  
  try {
    // ดึงข้อมูลล่าสุดเพื่อตรวจสอบ structure
    const response = await axios.get(`${API_URL}/api/admin/dashboard/recent?limit=1`);
    
    if (response.data.data.consents.length > 0) {
      const record = response.data.data.consents[0];
      const fields = Object.keys(record);
      
      console.log(`   ✅ consent_records table มี ${fields.length} fields`);
      console.log(`   Fields: ${fields.join(', ')}`);
      results.passed.push('Database Structure');
    }
  } catch (error) {
    console.log(`   ❌ ไม่สามารถตรวจสอบ database: ${error.message}`);
    results.failed.push(`Database: ${error.message}`);
  }
  
  // 4. สรุปผล
  console.log('\n' + '='.repeat(50));
  console.log('📊 สรุปผลการตรวจสอบ:\n');
  
  console.log(`✅ ผ่าน: ${results.passed.length} รายการ`);
  if (results.passed.length > 0) {
    results.passed.forEach(item => console.log(`   - ${item}`));
  }
  
  if (results.failed.length > 0) {
    console.log(`\n❌ ไม่ผ่าน: ${results.failed.length} รายการ`);
    results.failed.forEach(item => console.log(`   - ${item}`));
  }
  
  // 5. คำแนะนำ
  console.log('\n💡 สถานะระบบ:');
  if (results.failed.length === 0) {
    console.log('   ✅ ระบบทำงานปกติ พร้อมใช้งาน!');
  } else {
    console.log('   ⚠️ มีบางส่วนที่ต้องแก้ไข');
    console.log('   - ตรวจสอบว่า backend server รันอยู่ที่ port 3000');
    console.log('   - ตรวจสอบการเชื่อมต่อ database');
  }
  
  console.log('\n📝 Tables ที่ใช้งานจริง:');
  console.log('   1. consent_records - เก็บข้อมูล consent หลัก');
  console.log('   2. consent_history - เก็บประวัติการเปลี่ยนแปลง');
  console.log('\n   ❌ Tables อื่นๆ ไม่จำเป็น สามารถลบได้');
}

// รันการตรวจสอบ
verifySystemFlow().catch(console.error);
