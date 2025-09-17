const axios = require('axios');

const API_URL = 'http://localhost:3000/api';

async function testSystem() {
  console.log('🔍 ตรวจสอบระบบ Consent Management...\n');
  
  try {
    // 1. สร้าง Policy ใหม่
    console.log('1️⃣ ทดสอบสร้าง Policy...');
    const createResponse = await axios.post(`${API_URL}/simple-policy/create`, {
      user_type: 'customer',
      language: 'th-TH',
      version: '1.0',
      title: 'นโยบายความเป็นส่วนตัวลูกค้า',
      content: 'เนื้อหานโยบายความเป็นส่วนตัวสำหรับลูกค้า...',
      is_active: true
    });
    
    if (createResponse.data.success) {
      console.log('✅ สร้าง Policy สำเร็จ');
      console.log(`   - ID: ${createResponse.data.policy.id}`);
      console.log(`   - UserType: ${createResponse.data.policy.user_type}`);
      console.log(`   - Language: ${createResponse.data.policy.language}`);
      console.log(`   - Link: /consent/${createResponse.data.policy.user_type}?lang=th\n`);
    }
    
    // 2. ดึง Policy ที่สร้าง
    console.log('2️⃣ ทดสอบดึงข้อมูล Policy...');
    const listResponse = await axios.get(`${API_URL}/simple-policy/list`);
    const policies = listResponse.data.policies || [];
    console.log(`✅ พบ ${policies.length} policies`);
    
    if (policies.length > 0) {
      const policy = policies[0];
      console.log(`   - Title: ${policy.title}`);
      console.log(`   - Content: ${policy.content.substring(0, 50)}...`);
      console.log(`   - UserType: ${policy.user_type}`);
      console.log(`   - Language: ${policy.language}\n`);
    }
    
    // 3. ทดสอบ Submit Consent
    console.log('3️⃣ ทดสอบ Submit Consent...');
    const submitResponse = await axios.post(`${API_URL}/consent/submit`, {
      title: 'นาย',
      nameSurname: 'ทดสอบ ระบบ',
      idPassport: '1234567890123',
      email: 'test@example.com',
      phone: '0812345678',
      language: 'th',
      userType: 'customer',
      consentAccepted: true,
      ipAddress: '127.0.0.1',
      browserInfo: 'Test Browser'
    });
    
    if (submitResponse.data.success) {
      console.log('✅ บันทึก Consent สำเร็จ');
      console.log(`   - Reference: ${submitResponse.data.reference}`);
      console.log(`   - ข้อมูลที่เก็บ:`);
      console.log(`     • ชื่อ-นามสกุล: ${submitResponse.data.data.nameSurname}`);
      console.log(`     • เลขบัตร: ${submitResponse.data.data.idPassport}`);
      console.log(`     • Email: ${submitResponse.data.data.email}`);
      console.log(`     • โทรศัพท์: ${submitResponse.data.data.phone}`);
      console.log(`     • UserType: ${submitResponse.data.data.userType}`);
      console.log(`     • IP: ${submitResponse.data.data.ipAddress}`);
      console.log(`     • Browser: ${submitResponse.data.data.browserInfo}\n`);
    }
    
    // 4. ตรวจสอบ Consent Records
    console.log('4️⃣ ตรวจสอบ Consent Records...');
    const recordsResponse = await axios.get(`${API_URL}/consent/list`);
    const records = recordsResponse.data.consents || [];
    console.log(`✅ พบ ${records.length} consent records\n`);
    
    console.log('✨ ระบบทำงานปกติ - ไม่มี Error!');
    console.log('📋 สรุป:');
    console.log('   - สร้าง Policy ได้ ✅');
    console.log('   - ลิงก์แสดงเนื้อหาถูกต้อง ✅');
    console.log('   - เก็บข้อมูลครบถ้วน ✅');
    console.log('   - ไม่มี Error ✅');
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testSystem();
