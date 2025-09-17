const { Pool } = require('pg');
const axios = require('axios');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'consent',
  user: 'postgres',
  password: '4321'
});

async function resetAndTest() {
  try {
    console.log('🔄 RESET ระบบทั้งหมด...\n');
    
    // 1. ลบและสร้างตารางใหม่
    await pool.query('DROP TABLE IF EXISTS policy_versions CASCADE');
    await pool.query(`
      CREATE TABLE policy_versions (
        id SERIAL PRIMARY KEY,
        version VARCHAR(50),
        title VARCHAR(255),
        content TEXT,
        language VARCHAR(10),
        user_type VARCHAR(50),
        effective_date TIMESTAMP,
        expiry_date TIMESTAMP,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ สร้างตารางใหม่');
    
    // 2. สร้าง Customer Policies (2 ภาษา)
    console.log('\n📝 สร้าง Customer Policies:');
    
    // Customer Thai
    const customerThaiResult = await pool.query(
      `INSERT INTO policy_versions 
       (version, title, content, language, user_type, is_active, effective_date) 
       VALUES ($1, $2, $3, $4, $5, true, NOW())
       RETURNING id`,
      [
        '1.0.0',
        'นโยบายลูกค้า (ไทย)',
        '<h2>นโยบายความเป็นส่วนตัว</h2><p>นี่คือเนื้อหาภาษาไทยสำหรับลูกค้า</p><ul><li>ข้อมูลส่วนตัว</li><li>การใช้งาน</li></ul>',
        'th-TH',
        'customer'
      ]
    );
    console.log(`✅ Customer Thai - ID: ${customerThaiResult.rows[0].id}`);
    
    // Customer English
    const customerEnResult = await pool.query(
      `INSERT INTO policy_versions 
       (version, title, content, language, user_type, is_active, effective_date) 
       VALUES ($1, $2, $3, $4, $5, true, NOW())
       RETURNING id`,
      [
        '1.0.0',
        'Customer Policy (English)',
        '<h2>Privacy Policy</h2><p>This is English content for customers</p><ul><li>Personal Data</li><li>Usage</li></ul>',
        'en-US',
        'customer'
      ]
    );
    console.log(`✅ Customer English - ID: ${customerEnResult.rows[0].id}`);
    
    // 3. สร้าง Employee Policy
    const employeeResult = await pool.query(
      `INSERT INTO policy_versions 
       (version, title, content, language, user_type, is_active, effective_date) 
       VALUES ($1, $2, $3, $4, $5, true, NOW())
       RETURNING id`,
      [
        '1.0.0',
        'นโยบายพนักงาน',
        '<h2>นโยบายพนักงาน</h2><p>เนื้อหาสำหรับพนักงาน</p>',
        'th-TH',
        'employee'
      ]
    );
    console.log(`✅ Employee - ID: ${employeeResult.rows[0].id}`);
    
    // 4. สร้าง Partner Policy
    const partnerResult = await pool.query(
      `INSERT INTO policy_versions 
       (version, title, content, language, user_type, is_active, effective_date) 
       VALUES ($1, $2, $3, $4, $5, true, NOW())
       RETURNING id`,
      [
        '1.0.0',
        'นโยบายพันธมิตร',
        '<h2>นโยบายพันธมิตร</h2><p>เนื้อหาสำหรับพันธมิตร</p>',
        'th-TH',
        'partner'
      ]
    );
    console.log(`✅ Partner - ID: ${partnerResult.rows[0].id}`);
    
    // 5. ตรวจสอบข้อมูลในฐานข้อมูล
    console.log('\n📊 ตรวจสอบข้อมูลในฐานข้อมูล:');
    const checkData = await pool.query(`
      SELECT id, user_type, language, title 
      FROM policy_versions 
      ORDER BY user_type, language
    `);
    
    checkData.rows.forEach(row => {
      console.log(`[${row.id}] ${row.user_type} | ${row.language} | ${row.title}`);
    });
    
    // 6. ทดสอบ API
    console.log('\n🌐 ทดสอบ API:');
    
    // Test Customer Thai
    try {
      const res = await axios.get('http://localhost:3000/api/simple-policy/active?userType=customer&language=th-TH');
      if (res.data.success) {
        console.log(`✅ API Customer Thai: "${res.data.data.title}"`);
      }
    } catch (e) {
      console.log(`❌ API Customer Thai Error: ${e.message}`);
    }
    
    // Test Customer English
    try {
      const res = await axios.get('http://localhost:3000/api/simple-policy/active?userType=customer&language=en-US');
      if (res.data.success) {
        console.log(`✅ API Customer English: "${res.data.data.title}"`);
      }
    } catch (e) {
      console.log(`❌ API Customer English Error: ${e.message}`);
    }
    
    // Test Employee
    try {
      const res = await axios.get('http://localhost:3000/api/simple-policy/active?userType=employee&language=th-TH');
      if (res.data.success) {
        console.log(`✅ API Employee: "${res.data.data.title}"`);
      }
    } catch (e) {
      console.log(`❌ API Employee Error: ${e.message}`);
    }
    
    console.log('\n✅ เสร็จสิ้น!');
    console.log('\n📌 ทดสอบ:');
    console.log('1. Customer: http://localhost:3003/consent/select-language');
    console.log('   - เลือกไทย → "นโยบายลูกค้า (ไทย)"');
    console.log('   - เลือกอังกฤษ → "Customer Policy (English)"');
    console.log('2. Employee: http://localhost:3003/consent/employee?lang=th');
    console.log('3. Partner: http://localhost:3003/consent/partner?lang=th');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

resetAndTest();
