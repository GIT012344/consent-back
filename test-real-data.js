const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'consent',
  user: 'postgres',
  password: '4321'
});

async function checkRealData() {
  try {
    console.log('=== ตรวจสอบข้อมูลจริงใน Database ===\n');
    
    // 1. ตรวจสอบ table consent_records
    const recordsQuery = await pool.query('SELECT * FROM consent_records ORDER BY id DESC LIMIT 10');
    console.log('📊 Table: consent_records');
    console.log('จำนวนข้อมูล:', recordsQuery.rows.length);
    
    if (recordsQuery.rows.length > 0) {
      console.log('\nข้อมูลที่พบ:');
      recordsQuery.rows.forEach((row, i) => {
        console.log(`\n[${i+1}] Record ID: ${row.id}`);
        console.log('  - ชื่อ:', row.name_surname || 'ไม่มี');
        console.log('  - เลขบัตร:', row.id_passport || 'ไม่มี');
        console.log('  - Email:', row.email || 'ไม่มี');
        console.log('  - Phone:', row.phone || 'ไม่มี');
        console.log('  - User Type:', row.user_type || 'ไม่มี');
        console.log('  - วันที่:', row.created_date || row.created_at || 'ไม่มี');
      });
    } else {
      console.log('❌ ไม่มีข้อมูลใน consent_records!');
    }
    
    // 2. ตรวจสอบ table consent_history
    const historyQuery = await pool.query('SELECT COUNT(*) FROM consent_history');
    console.log('\n📊 Table: consent_history');
    console.log('จำนวนข้อมูล:', historyQuery.rows[0].count);
    
    // 3. ตรวจสอบ table policy_versions
    const policyQuery = await pool.query('SELECT * FROM policy_versions WHERE is_active = true');
    console.log('\n📊 Table: policy_versions');
    console.log('จำนวน active policies:', policyQuery.rows.length);
    
    // 4. ตรวจสอบว่ามี table consent_versions หรือไม่
    const tablesQuery = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE '%consent%'
      ORDER BY table_name
    `);
    console.log('\n📊 Tables ที่เกี่ยวกับ consent:');
    tablesQuery.rows.forEach(t => console.log('  -', t.table_name));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkRealData();
