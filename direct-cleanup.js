const { Client } = require('pg');

async function directCleanup() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'consent',
    user: 'postgres',
    password: '4321'
  });

  try {
    await client.connect();
    console.log('🔗 เชื่อมต่อ Database สำเร็จ\n');

    // 1. ดูโครงสร้างปัจจุบัน
    console.log('📋 โครงสร้างตาราง consent_records ปัจจุบัน:');
    console.log('=========================================');
    
    const columns = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'consent_records' 
      ORDER BY ordinal_position
    `);
    
    columns.rows.forEach((col, i) => {
      console.log(`${i+1}. ${col.column_name} (${col.data_type})`);
    });

    // 2. ลบ columns ที่ไม่จำเป็น
    console.log('\n🧹 ลบ columns ที่ซ้ำซ้อน/ไม่จำเป็น:');
    
    const dropList = [
      'uid',           // ซ้ำกับ consent_id ไม่จำเป็น
      'first_name',    // ใช้ name_surname แทน
      'last_name',     // ใช้ name_surname แทน
      'id_type',       // ไม่จำเป็น
      'id_number',     // ใช้ id_passport แทน
      'snapshot_html', // ใหญ่เกินไป
      'created_at'     // ใช้ created_date + created_time แทน
    ];

    for (const col of dropList) {
      try {
        await client.query(`ALTER TABLE consent_records DROP COLUMN IF EXISTS ${col}`);
        console.log(`  ✓ ลบ ${col}`);
      } catch (e) {
        console.log(`  ⚠️ ${col}: ${e.message}`);
      }
    }

    // 3. เพิ่ม columns ที่ขาด
    console.log('\n➕ เพิ่ม columns ที่จำเป็น:');
    
    try {
      await client.query(`
        ALTER TABLE consent_records 
        ADD COLUMN IF NOT EXISTS consent_id VARCHAR(50),
        ADD COLUMN IF NOT EXISTS consent_type VARCHAR(50) DEFAULT 'customer',
        ADD COLUMN IF NOT EXISTS policy_title VARCHAR(255),
        ADD COLUMN IF NOT EXISTS user_agent TEXT,
        ADD COLUMN IF NOT EXISTS created_time TIME DEFAULT CURRENT_TIME
      `);
      console.log('  ✓ เพิ่ม columns สำเร็จ');
    } catch (e) {
      console.log(`  ⚠️ ${e.message}`);
    }

    // 4. ปรับ data types
    console.log('\n🔧 ปรับ data types:');
    
    try {
      await client.query('ALTER TABLE consent_records ALTER COLUMN browser_info TYPE TEXT');
      console.log('  ✓ browser_info -> TEXT');
    } catch (e) {
      console.log(`  ⚠️ browser_info: ${e.message}`);
    }

    // 5. แสดงโครงสร้างใหม่
    console.log('\n✅ โครงสร้างตารางหลังทำความสะอาด:');
    console.log('=====================================');
    
    const newColumns = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'consent_records' 
      ORDER BY ordinal_position
    `);
    
    newColumns.rows.forEach((col, i) => {
      console.log(`${i+1}. ${col.column_name} (${col.data_type})`);
    });

    // 6. สรุป
    const count = await client.query('SELECT COUNT(*) FROM consent_records');
    console.log(`\n📊 จำนวนข้อมูลในตาราง: ${count.rows[0].count} records`);
    
    console.log('\n✨ ทำความสะอาด Database เสร็จสิ้น!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

directCleanup();
