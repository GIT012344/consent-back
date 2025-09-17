// Mock database for testing without PostgreSQL
const mockData = {
  user_types: [
    { id: 1, type_name: 'customer', description: 'ลูกค้าทั่วไป' },
    { id: 2, type_name: 'employee', description: 'พนักงาน' },
    { id: 3, type_name: 'partner', description: 'พาร์ทเนอร์' }
  ],
  consent_versions: [
    {
      id: 1,
      title: 'นโยบายความเป็นส่วนตัวสำหรับลูกค้า',
      version: '1.0.0',
      description: 'นโยบายความเป็นส่วนตัวสำหรับลูกค้าทั่วไป',
      content: `<div class="policy-content">
        <h2>นโยบายความเป็นส่วนตัว</h2>
        <p>บริษัทให้ความสำคัญกับการคุ้มครองข้อมูลส่วนบุคคลของท่านเป็นอย่างยิ่ง</p>
        
        <h3>1. ข้อมูลที่เราเก็บรวบรวม</h3>
        <ul>
          <li>ชื่อ-นามสกุล</li>
          <li>เลขบัตรประชาชน/หนังสือเดินทาง</li>
          <li>ข้อมูลติดต่อ (อีเมล, โทรศัพท์)</li>
        </ul>
        
        <h3>2. วัตถุประสงค์ในการใช้ข้อมูล</h3>
        <p>เราใช้ข้อมูลของท่านเพื่อ:</p>
        <ul>
          <li>ให้บริการตามที่ท่านร้องขอ</li>
          <li>ปรับปรุงคุณภาพการให้บริการ</li>
          <li>ติดต่อสื่อสารกับท่าน</li>
          <li>ปฏิบัติตามกฎหมายที่เกี่ยวข้อง</li>
        </ul>
        
        <h3>3. การเปิดเผยข้อมูล</h3>
        <p>เราจะไม่เปิดเผยข้อมูลส่วนบุคคลของท่านให้กับบุคคลภายนอก ยกเว้นในกรณีที่ได้รับความยินยอมจากท่าน</p>
        
        <h3>4. สิทธิของเจ้าของข้อมูล</h3>
        <p>ท่านมีสิทธิ:</p>
        <ul>
          <li>ขอเข้าถึงข้อมูลส่วนบุคคลของท่าน</li>
          <li>ขอแก้ไขข้อมูลให้ถูกต้อง</li>
          <li>ขอลบข้อมูล</li>
          <li>ขอถอนความยินยอม</li>
        </ul>
        
        <h3>5. การติดต่อ</h3>
        <p>หากมีคำถาม กรุณาติดต่อ: privacy@company.com</p>
      </div>`,
      file_content: 'นโยบายความเป็นส่วนตัวสำหรับลูกค้า',
      language: 'th',
      user_type: 'customer',
      is_active: true
    },
    {
      id: 2,
      title: 'นโยบายความเป็นส่วนตัวสำหรับพนักงาน',
      version: '1.0.0',
      description: 'นโยบายความเป็นส่วนตัวสำหรับพนักงาน',
      content: `<div class="policy-content">
        <h2>นโยบายความเป็นส่วนตัวสำหรับพนักงาน</h2>
        <p>บริษัทให้ความสำคัญกับการคุ้มครองข้อมูลส่วนบุคคลของพนักงาน</p>
        
        <h3>1. ข้อมูลที่เราเก็บรวบรวม</h3>
        <ul>
          <li>ข้อมูลส่วนบุคคล (ชื่อ, ที่อยู่, เลขประจำตัว)</li>
          <li>ข้อมูลการจ้างงาน</li>
          <li>ข้อมูลการประเมินผลงาน</li>
        </ul>
        
        <h3>2. วัตถุประสงค์</h3>
        <ul>
          <li>การบริหารทรัพยากรบุคคล</li>
          <li>การจ่ายเงินเดือนและสวัสดิการ</li>
          <li>การพัฒนาบุคลากร</li>
        </ul>
      </div>`,
      file_content: 'นโยบายความเป็นส่วนตัวสำหรับพนักงาน',
      language: 'th',
      user_type: 'employee',
      is_active: true
    },
    {
      id: 3,
      title: 'นโยบายความเป็นส่วนตัวสำหรับพาร์ทเนอร์',
      version: '1.0.0',
      description: 'นโยบายความเป็นส่วนตัวสำหรับพาร์ทเนอร์',
      content: `<div class="policy-content">
        <h2>นโยบายความเป็นส่วนตัวสำหรับพาร์ทเนอร์</h2>
        <p>บริษัทให้ความสำคัญกับการคุ้มครองข้อมูลของพาร์ทเนอร์ธุรกิจ</p>
        
        <h3>1. ข้อมูลที่เราเก็บรวบรวม</h3>
        <ul>
          <li>ข้อมูลบริษัท</li>
          <li>ข้อมูลผู้ติดต่อ</li>
          <li>ข้อมูลการทำธุรกรรม</li>
        </ul>
        
        <h3>2. การใช้ข้อมูล</h3>
        <ul>
          <li>การดำเนินธุรกิจร่วมกัน</li>
          <li>การติดต่อประสานงาน</li>
          <li>การพัฒนาความร่วมมือ</li>
        </ul>
      </div>`,
      file_content: 'นโยบายความเป็นส่วนตัวสำหรับพาร์ทเนอร์',
      language: 'th',
      user_type: 'partner',
      is_active: true
    }
  ],
  consent_records: [],
  consent_titles: [
    { id: 1, title_th: 'นาย', title_en: 'Mr.' },
    { id: 2, title_th: 'นาง', title_en: 'Mrs.' },
    { id: 3, title_th: 'นางสาว', title_en: 'Ms.' }
  ]
};

// Mock pool object
const mockPool = {
  query: async (sql, params) => {
    console.log('Mock query:', sql.substring(0, 50) + '...');
    
    // Handle different queries
    if (sql.includes('SELECT * FROM user_types')) {
      return { rows: mockData.user_types };
    }
    
    if (sql.includes('SELECT * FROM consent_versions WHERE user_type')) {
      const userType = params ? params[0] : 'customer';
      const language = params ? params[1] : 'th';
      const result = mockData.consent_versions.filter(
        v => v.user_type === userType && v.language === language && v.is_active
      );
      return { rows: result };
    }
    
    if (sql.includes('SELECT * FROM consent_titles')) {
      return { rows: mockData.consent_titles };
    }
    
    if (sql.includes('INSERT INTO consent_records')) {
      const newRecord = {
        id: mockData.consent_records.length + 1,
        ...params
      };
      mockData.consent_records.push(newRecord);
      return { rows: [newRecord] };
    }
    
    // Default response
    return { rows: [] };
  },
  
  connect: async () => ({
    query: mockPool.query,
    release: () => {}
  }),
  
  end: async () => {}
};

module.exports = {
  pool: mockPool,
  mockData
};
