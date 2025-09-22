const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '4321',
  database: 'consent'
});

async function fixEverything() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 แก้ไขทุกอย่างให้ทำงานได้\n');
    console.log('='.repeat(50));
    
    // 1. ลบ policies เก่าทั้งหมด
    console.log('1. ลบข้อมูลเก่าทั้งหมด...');
    await client.query('DELETE FROM policy_versions');
    console.log('   ✅ ลบข้อมูลเก่าแล้ว');
    
    // 2. สร้าง policies ใหม่พร้อมเนื้อหาที่ถูกต้อง
    console.log('\n2. สร้าง policies ใหม่:');
    
    // 001 - ลูกค้าไทย
    await client.query(`
      INSERT INTO policy_versions (
        title, user_type, language, version, content, is_active
      ) VALUES (
        '001', 
        'customer', 
        'th', 
        '1.0',
        '<h2>ข้อตกลงและเงื่อนไขการใช้บริการ (ลูกค้า)</h2>
        <p>ยินดีต้อนรับสู่บริการของเรา นี่คือข้อตกลงสำหรับลูกค้าภาษาไทย</p>
        <h3>1. การยอมรับข้อตกลง</h3>
        <p>การใช้บริการของเราถือว่าท่านยอมรับข้อตกลงและเงื่อนไขทั้งหมด</p>
        <h3>2. การเก็บรวบรวมข้อมูล</h3>
        <p>เราจะเก็บรวบรวมข้อมูลส่วนบุคคลของท่านเพื่อการให้บริการที่ดีขึ้น</p>',
        true
      )
    `);
    console.log('   ✅ สร้าง 001 - ลูกค้าไทย');
    
    // 002 - ลูกค้าอังกฤษ
    await client.query(`
      INSERT INTO policy_versions (
        title, user_type, language, version, content, is_active
      ) VALUES (
        '002',
        'customer',
        'en',
        '1.0', 
        '<h2>Terms and Conditions (Customer)</h2>
        <p>Welcome to our service. This is the agreement for English customers.</p>
        <h3>1. Acceptance of Terms</h3>
        <p>By using our service, you agree to all terms and conditions.</p>
        <h3>2. Data Collection</h3>
        <p>We collect your personal data to provide better services.</p>',
        true
      )
    `);
    console.log('   ✅ สร้าง 002 - ลูกค้าอังกฤษ');
    
    // 003 - พนักงานไทย
    await client.query(`
      INSERT INTO policy_versions (
        title, user_type, language, version, content, is_active
      ) VALUES (
        '003',
        'employee',
        'th',
        '1.0',
        '<h2>ข้อตกลงการใช้งานสำหรับพนักงาน</h2>
        <p>ข้อตกลงนี้มีผลบังคับใช้กับพนักงานทุกคน</p>
        <h3>1. การรักษาความลับ</h3>
        <p>พนักงานต้องรักษาความลับของบริษัทและลูกค้า</p>
        <h3>2. การใช้ทรัพยากร</h3>
        <p>ใช้ทรัพยากรของบริษัทอย่างมีประสิทธิภาพ</p>',
        true
      )
    `);
    console.log('   ✅ สร้าง 003 - พนักงานไทย');
    
    // 3. ตรวจสอบผลลัพธ์
    console.log('\n3. ตรวจสอบผลลัพธ์:');
    const result = await client.query(`
      SELECT user_type, language, title, LEFT(content, 100) as content_preview
      FROM policy_versions
      WHERE is_active = true
      ORDER BY title
    `);
    
    console.log('\nPolicies ที่สร้างใหม่:');
    result.rows.forEach(p => {
      console.log(`\n${p.title}: ${p.user_type}/${p.language}`);
      console.log(`เนื้อหา: ${p.content_preview}...`);
    });
    
    console.log('\n='.repeat(50));
    console.log('✅ แก้ไขเสร็จสิ้น!\n');
    console.log('ทดสอบได้ที่:');
    console.log('• ลูกค้าไทย: http://localhost:5000/consent/customer?lang=th');
    console.log('  → จะเห็น "ข้อตกลงและเงื่อนไขการใช้บริการ (ลูกค้า)"');
    console.log('\n• ลูกค้าอังกฤษ: http://localhost:5000/consent/customer?lang=en');
    console.log('  → จะเห็น "Terms and Conditions (Customer)"');
    console.log('\n• พนักงานไทย: http://localhost:5000/consent/employee?lang=th');
    console.log('  → จะเห็น "ข้อตกลงการใช้งานสำหรับพนักงาน"');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

fixEverything();
