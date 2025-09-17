const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'consent',
  user: 'postgres',
  password: '4321'
});

async function fixTable() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 กำลังทำความสะอาดตาราง consent_records...\n');
    
    // เริ่ม transaction
    await client.query('BEGIN');
    
    // 1. ลบ columns ที่ไม่จำเป็น
    console.log('❌ ลบ columns ที่ซ้ำซ้อน:');
    const dropColumns = [
      'uid',           // ไม่จำเป็น ใช้ consent_id แทน
      'first_name',    // ซ้ำ ใช้ name_surname
      'last_name',     // ซ้ำ ใช้ name_surname  
      'id_type',       // ไม่จำเป็น
      'id_number',     // ซ้ำ ใช้ id_passport
      'snapshot_html', // ใหญ่เกินไป
      'created_at'     // ซ้ำ ใช้ created_date
    ];
    
    for (const col of dropColumns) {
      try {
        await client.query(`ALTER TABLE consent_records DROP COLUMN IF EXISTS ${col} CASCADE`);
        console.log(`  ✓ ลบ ${col}`);
      } catch (err) {
        console.log(`  ⚠️ ${col}: ลบไม่ได้`);
      }
    }
    
    // 2. เพิ่ม columns ที่ขาด
    console.log('\n✅ เพิ่ม columns ที่จำเป็น:');
    
    // เพิ่มทีละ column เพื่อหลีกเลี่ยง error
    const addColumns = [
      ['consent_id', 'VARCHAR(50)'],
      ['consent_type', 'VARCHAR(50) DEFAULT \'customer\''],
      ['policy_title', 'VARCHAR(255)'],
      ['user_agent', 'TEXT'],
      ['created_time', 'TIME DEFAULT CURRENT_TIME']
    ];
    
    for (const [name, type] of addColumns) {
      try {
        await client.query(`ALTER TABLE consent_records ADD COLUMN IF NOT EXISTS ${name} ${type}`);
        console.log(`  ✓ เพิ่ม ${name}`);
      } catch (err) {
        console.log(`  ⚠️ ${name}: มีอยู่แล้ว`);
      }
    }
    
    // 3. ปรับ data type ของ browser_info
    console.log('\n🔧 ปรับ data types:');
    try {
      await client.query('ALTER TABLE consent_records ALTER COLUMN browser_info TYPE TEXT');
      console.log('  ✓ browser_info เป็น TEXT');
    } catch (err) {
      console.log('  ⚠️ browser_info: ปรับไม่ได้');
    }
    
    // 4. สร้าง unique constraint สำหรับ consent_id
    try {
      await client.query('ALTER TABLE consent_records ADD CONSTRAINT unique_consent_id UNIQUE (consent_id)');
      console.log('  ✓ เพิ่ม unique constraint สำหรับ consent_id');
    } catch (err) {
      if (err.code === '42710') {
        console.log('  ⚠️ unique constraint มีอยู่แล้ว');
      }
    }
    
    // 5. สร้าง indexes
    console.log('\n📇 สร้าง indexes:');
    const indexes = [
      ['idx_consent_records_consent_id', 'consent_id'],
      ['idx_consent_records_id_passport', 'id_passport'],
      ['idx_consent_records_created_date', 'created_date']
    ];
    
    for (const [name, column] of indexes) {
      try {
        await client.query(`CREATE INDEX IF NOT EXISTS ${name} ON consent_records(${column})`);
        console.log(`  ✓ ${name}`);
      } catch (err) {
        console.log(`  ⚠️ ${name}: มีอยู่แล้ว`);
      }
    }
    
    // Commit transaction
    await client.query('COMMIT');
    
    // 6. แสดงโครงสร้างสุดท้าย
    const result = await client.query(`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'consent_records'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 โครงสร้างตารางหลังทำความสะอาด:');
    console.log('=====================================');
    result.rows.forEach((col, i) => {
      const len = col.character_maximum_length ? `(${col.character_maximum_length})` : '';
      console.log(`${i+1}. ${col.column_name}: ${col.data_type}${len}`);
    });
    
    // นับจำนวน records
    const count = await client.query('SELECT COUNT(*) FROM consent_records');
    console.log(`\n📊 จำนวนข้อมูล: ${count.rows[0].count} records`);
    
    console.log('\n✨ ทำความสะอาดเสร็จสิ้น!');
    console.log('\n💡 คำอธิบาย columns:');
    console.log('- consent_id: รหัส consent ที่ generate อัตโนมัติ (CNSxxxxx)');
    console.log('- id_passport: เลขบัตรประชาชน/พาสปอร์ต');
    console.log('- name_surname: ชื่อ-นามสกุล');
    console.log('- ไม่มี uid, first_name, last_name แล้ว (ซ้ำซ้อน)');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    pool.end();
  }
}

fixTable().catch(console.error);
