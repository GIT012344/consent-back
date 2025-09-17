const { pool } = require('./config/database');

async function checkTableStructure() {
  console.log('=== ตรวจสอบโครงสร้างตาราง consent_records ===\n');
  
  try {
    // ดูโครงสร้างตารางปัจจุบัน
    const result = await pool.query(`
      SELECT 
        column_name,
        data_type,
        character_maximum_length,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'consent_records'
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Columns ในตาราง consent_records:');
    console.log('=====================================');
    result.rows.forEach((col, index) => {
      const length = col.character_maximum_length ? `(${col.character_maximum_length})` : '';
      const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
      const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
      console.log(`${index + 1}. ${col.column_name}: ${col.data_type}${length} ${nullable}${defaultVal}`);
    });
    
    // ตรวจสอบ columns ที่ซ้ำซ้อนหรือไม่จำเป็น
    console.log('\n🔍 วิเคราะห์ columns:');
    console.log('====================');
    
    const columns = result.rows.map(r => r.column_name);
    
    // Columns ที่ควรมี
    const requiredColumns = [
      'id',                  // Primary key
      'consent_id',          // Unique consent ID
      'title',               // คำนำหน้า
      'name_surname',        // ชื่อ-นามสกุล
      'id_passport',         // เลขบัตร/พาสปอร์ต
      'email',               // อีเมล
      'phone',               // เบอร์โทร
      'user_type',           // ประเภทผู้ใช้ (customer/employee/partner)
      'consent_type',        // ประเภท consent
      'consent_language',    // ภาษา (th/en)
      'consent_version',     // เวอร์ชัน policy
      'consent_version_id',  // ID ของ version
      'policy_title',        // ชื่อ policy
      'ip_address',          // IP address
      'browser_info',        // Browser
      'user_agent',          // User agent string
      'is_active',           // สถานะ active
      'created_date',        // วันที่สร้าง
      'created_time',        // เวลาสร้าง
      'updated_at'           // วันเวลาอัปเดต
    ];
    
    // Columns ที่ไม่จำเป็น/ซ้ำซ้อน
    const unnecessaryColumns = [
      'uid',                 // ซ้ำกับ consent_id
      'first_name',          // ซ้ำกับ name_surname
      'last_name',           // ซ้ำกับ name_surname
      'id_type',             // ไม่จำเป็น
      'id_number',           // ซ้ำกับ id_passport
      'snapshot_html',       // ใหญ่เกินไป ไม่จำเป็น
      'created_at'           // ซ้ำกับ created_date
    ];
    
    console.log('\n✅ Columns ที่ควรมี:');
    requiredColumns.forEach(col => {
      if (columns.includes(col)) {
        console.log(`  ✓ ${col}`);
      } else {
        console.log(`  ✗ ${col} (ไม่มี)`);
      }
    });
    
    console.log('\n❌ Columns ที่ควรลบ:');
    columns.forEach(col => {
      if (unnecessaryColumns.includes(col)) {
        console.log(`  - ${col} (ไม่จำเป็น/ซ้ำซ้อน)`);
      }
    });
    
    // ตรวจสอบข้อมูลตัวอย่าง
    const sampleData = await pool.query('SELECT * FROM consent_records LIMIT 1');
    if (sampleData.rows.length > 0) {
      console.log('\n📊 ข้อมูลตัวอย่าง:');
      console.log('================');
      const sample = sampleData.rows[0];
      Object.keys(sample).forEach(key => {
        const value = sample[key];
        if (value !== null && value !== '') {
          console.log(`${key}: ${typeof value === 'string' && value.length > 50 ? value.substring(0, 50) + '...' : value}`);
        }
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkTableStructure();
