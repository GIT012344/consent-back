const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '4321',
  database: 'consent'
});

async function ensureContentWorks() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 ตรวจสอบและแก้ไขให้เนื้อหาแสดงถูกต้อง\n');
    console.log('='.repeat(80));
    
    // 1. ดูว่ามี policy อะไรบ้าง
    const existing = await client.query(`
      SELECT id, user_type, language, title, 
             content,
             created_at, updated_at
      FROM policy_versions
      WHERE is_active = true
      ORDER BY created_at DESC
    `);
    
    console.log(`พบ ${existing.rows.length} policies:\n`);
    
    if (existing.rows.length === 0) {
      console.log('❌ ไม่มี policy เลย - กำลังสร้างตัวอย่าง...\n');
      
      // สร้างตัวอย่าง
      await client.query(`
        INSERT INTO policy_versions (
          title, user_type, language, version, content, is_active
        ) VALUES 
        ('Policy 001', 'customer', 'th', '1.0', '<h1>นโยบายลูกค้าไทย</h1><p>เนื้อหาที่ Admin สร้าง</p>', true),
        ('Policy 002', 'customer', 'en', '1.0', '<h1>Customer Policy English</h1><p>Content created by Admin</p>', true),
        ('Policy 003', 'employee', 'th', '1.0', '<h1>นโยบายพนักงาน</h1><p>เนื้อหาสำหรับพนักงาน</p>', true)
      `);
      
      console.log('✅ สร้าง policies ตัวอย่างแล้ว');
    } else {
      existing.rows.forEach((p, i) => {
        console.log(`${i+1}. ${p.user_type}/${p.language}: "${p.title}"`);
        console.log(`   ID: ${p.id}`);
        console.log(`   เนื้อหา: ${p.content.substring(0, 100)}...`);
        console.log(`   Created: ${new Date(p.created_at).toLocaleString('th-TH')}`);
        console.log('');
      });
    }
    
    console.log('='.repeat(80));
    console.log('\n✅ ระบบพร้อมใช้งาน!\n');
    console.log('📝 การสร้าง/แก้ไข Policy:');
    console.log('1. ไปที่: http://localhost:5000/admin/create-policy');
    console.log('2. กรอกข้อมูล:');
    console.log('   - Title: ชื่อ policy');
    console.log('   - User Type: customer/employee/partner');
    console.log('   - Language: th-TH หรือ en-US');
    console.log('   - Content: เนื้อหาที่ต้องการแสดง');
    console.log('3. กด Save');
    console.log('\n⚠️ ถ้า Title ซ้ำ = อัพเดทเนื้อหาใหม่ทับของเดิม');
    console.log('\n🔗 ทดสอบการแสดงผล:');
    console.log('• ลูกค้าไทย: http://localhost:5000/consent/customer?lang=th');
    console.log('• ลูกค้าอังกฤษ: http://localhost:5000/consent/customer?lang=en');
    console.log('• พนักงานไทย: http://localhost:5000/consent/employee?lang=th');
    console.log('\n💡 เนื้อหาที่แสดง = เนื้อหาที่ Admin พิมพ์ใน Content');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

ensureContentWorks();
