const axios = require('axios');

async function testApiResponse() {
  try {
    console.log('🔍 ทดสอบ API Response\n');
    console.log('='.repeat(80));
    
    // Call the API
    const response = await axios.get('http://localhost:3000/api/consent/records');
    
    console.log('1. API Response Status:', response.status);
    console.log('\n2. Response Data Structure:');
    console.log('   - success:', response.data.success);
    console.log('   - has data?:', !!response.data.data);
    console.log('   - has records?:', !!response.data.records);
    
    // Get the actual records
    const records = response.data.data || response.data.records || [];
    
    console.log(`\n3. จำนวน Records: ${records.length}\n`);
    
    if (records.length > 0) {
      console.log('4. ตัวอย่าง Record แรก:');
      const firstRecord = records[0];
      console.log(JSON.stringify(firstRecord, null, 2));
      
      console.log('\n5. ตรวจสอบ Fields:');
      console.log('   - id:', firstRecord.id);
      console.log('   - name_surname:', firstRecord.name_surname);
      console.log('   - user_type:', firstRecord.user_type);
      console.log('   - policy_title:', firstRecord.policy_title);
      console.log('   - consent_language:', firstRecord.consent_language);
      
      console.log('\n6. Records ที่มี policy_title:');
      records.forEach(r => {
        if (r.policy_title && r.policy_title !== 'null' && r.policy_title !== 'N/A') {
          console.log(`   ID ${r.id}: ${r.name_surname} → "${r.policy_title}"`);
        }
      });
      
      console.log('\n7. Records ที่ไม่มี policy_title:');
      records.forEach(r => {
        if (!r.policy_title || r.policy_title === 'null' || r.policy_title === 'N/A') {
          console.log(`   ID ${r.id}: ${r.name_surname} → "${r.policy_title || 'undefined'}"`);
        }
      });
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('\n📊 สรุป:');
    console.log('API ส่ง policy_title กลับมาหรือไม่?');
    if (records.length > 0 && records[0].policy_title !== undefined) {
      console.log('✅ API ส่ง policy_title กลับมา');
      console.log('ปัญหาอาจอยู่ที่ Frontend mapping');
    } else {
      console.log('❌ API ไม่ส่ง policy_title กลับมา');
      console.log('ต้องแก้ไขที่ Backend API');
    }
    
  } catch (error) {
    console.error('❌ Error calling API:', error.message);
    console.log('\nตรวจสอบว่า:');
    console.log('1. Backend server รันอยู่ที่ port 3000');
    console.log('2. Database connection ทำงานปกติ');
  }
}

testApiResponse();
