const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '4321',
  database: 'consent'
});

async function fixCustomerLanguage() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 แก้ไขปัญหาภาษาลูกค้า\n');
    console.log('='.repeat(50));
    
    // 1. ดูสถานะปัจจุบัน
    console.log('\nข้อมูลปัจจุบัน:');
    const current = await client.query(`
      SELECT id, user_type, language, title 
      FROM policy_versions 
      WHERE user_type = 'customer' AND is_active = true
      ORDER BY id
    `);
    
    current.rows.forEach(row => {
      console.log(`  ID ${row.id}: ${row.user_type}/${row.language} = "${row.title}"`);
    });
    
    // 2. แก้ไข title "01" เป็น "001"
    await client.query(`
      UPDATE policy_versions 
      SET title = '001'
      WHERE title = '01' AND user_type = 'customer'
    `);
    console.log('\n✅ แก้ title "01" เป็น "001"');
    
    // 3. ตรวจสอบและแก้ไขภาษา
    // 001 ต้องเป็น Thai (th)
    await client.query(`
      UPDATE policy_versions 
      SET language = 'th'
      WHERE title = '001' AND user_type = 'customer'
    `);
    console.log('✅ Set 001 = Thai (th)');
    
    // 002 ต้องเป็น English (en)
    await client.query(`
      UPDATE policy_versions 
      SET language = 'en'
      WHERE title = '002' AND user_type = 'customer'
    `);
    console.log('✅ Set 002 = English (en)');
    
    // 4. แสดงผลลัพธ์
    console.log('\n' + '='.repeat(50));
    console.log('ผลลัพธ์หลังแก้ไข:\n');
    
    const result = await client.query(`
      SELECT user_type, language, title 
      FROM policy_versions 
      WHERE is_active = true
      ORDER BY user_type, language
    `);
    
    result.rows.forEach(row => {
      const langText = row.language === 'th' ? 'ภาษาไทย' : 'English';
      console.log(`✅ ${row.user_type}/${langText}: "${row.title}"`);
    });
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ แก้ไขเสร็จสิ้น!\n');
    console.log('ทดสอบ:');
    console.log('• ลูกค้าไทย: http://localhost:5000/consent/customer?lang=th → แสดง "001"');
    console.log('• ลูกค้าอังกฤษ: http://localhost:5000/consent/customer?lang=en → แสดง "002"');
    console.log('• พนักงานไทย: http://localhost:5000/consent/employee?lang=th → แสดง "003"');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

fixCustomerLanguage();
