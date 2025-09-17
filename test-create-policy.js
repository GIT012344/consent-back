const axios = require('axios');

async function createTestPolicy() {
  const baseURL = 'http://localhost:3000';
  
  console.log('Creating test policies...\n');
  
  // Create Thai policy for customers
  try {
    const thaiPolicy = await axios.post(`${baseURL}/api/simple-policy`, {
      version: '2.0',
      language: 'th-TH',
      userType: 'customer',
      title: 'นโยบายความเป็นส่วนตัว - ลูกค้า',
      content: `
        <h2>นโยบายความเป็นส่วนตัวสำหรับลูกค้า</h2>
        <p><strong>วันที่มีผลบังคับใช้:</strong> 1 มกราคม 2567</p>
        
        <h3>1. ข้อมูลที่เราเก็บรวบรวม</h3>
        <p>เราเก็บรวบรวมข้อมูลส่วนบุคคลของคุณเพื่อให้บริการที่ดีที่สุด ได้แก่:</p>
        <ul>
          <li>ชื่อ-นามสกุล</li>
          <li>เลขบัตรประชาชน/พาสปอร์ต</li>
          <li>อีเมล และเบอร์โทรศัพท์</li>
          <li>ข้อมูลการใช้บริการ</li>
        </ul>
        
        <h3>2. วัตถุประสงค์ในการใช้ข้อมูล</h3>
        <p>เราใช้ข้อมูลของคุณเพื่อ:</p>
        <ul>
          <li>ให้บริการตามที่คุณร้องขอ</li>
          <li>ปรับปรุงคุณภาพการบริการ</li>
          <li>ติดต่อสื่อสารเกี่ยวกับบริการ</li>
          <li>ปฏิบัติตามกฎหมายที่เกี่ยวข้อง</li>
        </ul>
        
        <h3>3. การแบ่งปันข้อมูล</h3>
        <p>เราจะไม่แบ่งปันข้อมูลส่วนบุคคลของคุณกับบุคคลที่สาม ยกเว้น:</p>
        <ul>
          <li>ได้รับความยินยอมจากคุณ</li>
          <li>เป็นไปตามกฎหมาย</li>
          <li>เพื่อปกป้องสิทธิและทรัพย์สิน</li>
        </ul>
        
        <h3>4. สิทธิของคุณ</h3>
        <p>คุณมีสิทธิ:</p>
        <ul>
          <li>เข้าถึงข้อมูลส่วนบุคคลของคุณ</li>
          <li>แก้ไขข้อมูลที่ไม่ถูกต้อง</li>
          <li>ขอให้ลบข้อมูล</li>
          <li>คัดค้านการประมวลผลข้อมูล</li>
        </ul>
        
        <h3>5. การติดต่อเรา</h3>
        <p>หากมีคำถามเกี่ยวกับนโยบายนี้ กรุณาติดต่อ:</p>
        <p>อีเมล: privacy@example.com<br>
        โทร: 02-123-4567</p>
      `
    });
    
    console.log('✅ Thai Customer Policy Created:');
    console.log(`   Link: ${thaiPolicy.data.data.consentLink}`);
    console.log(`   Version: ${thaiPolicy.data.data.version}`);
    
  } catch (error) {
    console.error('❌ Error creating Thai policy:', error.message);
  }
  
  // Create English policy for customers
  try {
    const englishPolicy = await axios.post(`${baseURL}/api/simple-policy`, {
      version: '2.0',
      language: 'en-US',
      userType: 'customer',
      title: 'Privacy Policy - Customers',
      content: `
        <h2>Privacy Policy for Customers</h2>
        <p><strong>Effective Date:</strong> January 1, 2024</p>
        
        <h3>1. Information We Collect</h3>
        <p>We collect personal information to provide you with the best service, including:</p>
        <ul>
          <li>Name and Surname</li>
          <li>ID/Passport Number</li>
          <li>Email and Phone Number</li>
          <li>Service Usage Data</li>
        </ul>
        
        <h3>2. How We Use Your Information</h3>
        <p>We use your information to:</p>
        <ul>
          <li>Provide services as requested</li>
          <li>Improve service quality</li>
          <li>Communicate about our services</li>
          <li>Comply with legal requirements</li>
        </ul>
        
        <h3>3. Information Sharing</h3>
        <p>We do not share your personal information with third parties except:</p>
        <ul>
          <li>With your consent</li>
          <li>As required by law</li>
          <li>To protect rights and property</li>
        </ul>
        
        <h3>4. Your Rights</h3>
        <p>You have the right to:</p>
        <ul>
          <li>Access your personal data</li>
          <li>Correct inaccurate data</li>
          <li>Request data deletion</li>
          <li>Object to data processing</li>
        </ul>
        
        <h3>5. Contact Us</h3>
        <p>If you have questions about this policy, please contact:</p>
        <p>Email: privacy@example.com<br>
        Phone: +66 2-123-4567</p>
      `
    });
    
    console.log('✅ English Customer Policy Created:');
    console.log(`   Link: ${englishPolicy.data.data.consentLink}`);
    console.log(`   Version: ${englishPolicy.data.data.version}`);
    
  } catch (error) {
    console.error('❌ Error creating English policy:', error.message);
  }
  
  // Create Thai policy for employees
  try {
    const employeePolicy = await axios.post(`${baseURL}/api/simple-policy`, {
      version: '1.5',
      language: 'th-TH',
      userType: 'employee',
      title: 'นโยบายความเป็นส่วนตัว - พนักงาน',
      content: `
        <h2>นโยบายความเป็นส่วนตัวสำหรับพนักงาน</h2>
        <p><strong>สำหรับพนักงานและบุคลากรภายใน</strong></p>
        
        <h3>ข้อมูลที่บริษัทเก็บรวบรวม</h3>
        <p>บริษัทเก็บรวบรวมข้อมูลพนักงานเพื่อการบริหารทรัพยากรบุคคล:</p>
        <ul>
          <li>ข้อมูลส่วนตัวและครอบครัว</li>
          <li>ประวัติการศึกษาและการทำงาน</li>
          <li>ข้อมูลการจ่ายเงินเดือนและสวัสดิการ</li>
          <li>ข้อมูลสุขภาพที่จำเป็น</li>
        </ul>
        
        <h3>การใช้ข้อมูลภายในองค์กร</h3>
        <p>ข้อมูลจะถูกใช้เฉพาะเพื่อ:</p>
        <ul>
          <li>การบริหารงานบุคคล</li>
          <li>การจ่ายค่าตอบแทนและสวัสดิการ</li>
          <li>การพัฒนาบุคลากร</li>
          <li>การรักษาความปลอดภัย</li>
        </ul>
      `
    });
    
    console.log('✅ Thai Employee Policy Created:');
    console.log(`   Link: ${employeePolicy.data.data.consentLink}`);
    console.log(`   Version: ${employeePolicy.data.data.version}`);
    
  } catch (error) {
    console.error('❌ Error creating Employee policy:', error.message);
  }
  
  console.log('\n📋 Test Links:');
  console.log('Thai Customer: http://localhost:3003/consent/customer?lang=th');
  console.log('English Customer: http://localhost:3003/consent/customer?lang=en');
  console.log('Thai Employee: http://localhost:3003/consent/employee?lang=th');
}

// Run the test
createTestPolicy();
