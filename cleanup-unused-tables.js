const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '4321',
  database: process.env.DB_NAME || 'consent'
});

async function cleanupUnusedTables() {
  const client = await pool.connect();
  
  try {
    console.log('🧹 เริ่มลบ tables ที่ไม่ใช้งาน...\n');
    
    // Tables ที่จำเป็นต้องเก็บไว้
    const KEEP_TABLES = [
      'consent_records',     // ✅ ใช้เก็บข้อมูล consent หลัก
      'consent_history'      // ✅ ใช้เก็บประวัติ consent
    ];
    
    // Tables ที่ไม่ใช้และควรลบ
    const REMOVE_TABLES = [
      'admin_users',              // ❌ ไม่ใช้ - ไม่มีระบบ admin login
      'audiences',                // ❌ ไม่ใช้ - ใช้ user_type ใน consent_records แทน
      'audit_logs',               // ❌ ไม่ใช้ - ไม่มีระบบ audit
      'consent_form_fields',      // ❌ ไม่ใช้ - ใช้ form แบบ fixed
      'consent_titles',           // ❌ ไม่ใช้ - ไม่เก็บ title แล้ว
      'consent_version_targeting',// ❌ ไม่ใช้ - ไม่มีระบบ version targeting
      'consent_versions',         // ❌ ไม่ใช้ - ใช้ version ใน consent_records
      'consents',                 // ❌ ไม่ใช้ - ใช้ consent_records แทน
      'form_templates',           // ❌ ไม่ใช้ - ใช้ form แบบ fixed
      'policies',                 // ❌ ไม่ใช้ - ไม่มีระบบ policy management
      'policy_kinds',             // ❌ ไม่ใช้
      'policy_version_audiences', // ❌ ไม่ใช้
      'policy_versions',          // ❌ ไม่ใช้
      'tenants',                  // ❌ ไม่ใช้ - ไม่มีระบบ multi-tenant
      'user_consents',            // ❌ ไม่ใช้ - ใช้ consent_records แทน
      'user_types',               // ❌ ไม่ใช้ - ใช้ user_type field แทน
      'users'                     // ❌ ไม่ใช้ - ไม่เก็บข้อมูล user แยก
    ];
    
    console.log('📋 Tables ที่จะเก็บไว้:');
    KEEP_TABLES.forEach(table => console.log(`   ✅ ${table}`));
    
    console.log('\n📋 Tables ที่จะลบ:');
    REMOVE_TABLES.forEach(table => console.log(`   ❌ ${table}`));
    
    console.log('\n🗑️ เริ่มลบ tables...\n');
    
    for (const table of REMOVE_TABLES) {
      try {
        await client.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
        console.log(`   ✅ ลบ ${table} สำเร็จ`);
      } catch (err) {
        console.log(`   ⚠️ ไม่สามารถลบ ${table}: ${err.message}`);
      }
    }
    
    // แสดง tables ที่เหลือ
    console.log('\n📊 Tables ที่เหลือในฐานข้อมูล:');
    const remainingTables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    remainingTables.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });
    
    // แสดงข้อมูลสรุป consent_records
    console.log('\n📊 ข้อมูลใน consent_records:');
    const stats = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(DISTINCT user_type) as user_types,
        COUNT(DISTINCT consent_language) as languages,
        COUNT(DISTINCT consent_version) as versions
      FROM consent_records
    `);
    
    console.log(`   - จำนวน records ทั้งหมด: ${stats.rows[0].total}`);
    console.log(`   - User types: ${stats.rows[0].user_types} ประเภท`);
    console.log(`   - ภาษา: ${stats.rows[0].languages} ภาษา`);
    console.log(`   - Versions: ${stats.rows[0].versions} เวอร์ชัน`);
    
    // แสดง user types ที่มี
    const userTypes = await client.query(`
      SELECT DISTINCT user_type, COUNT(*) as count
      FROM consent_records
      GROUP BY user_type
      ORDER BY count DESC
    `);
    
    if (userTypes.rows.length > 0) {
      console.log('\n   User Types:');
      userTypes.rows.forEach(row => {
        console.log(`     - ${row.user_type || 'null'}: ${row.count} records`);
      });
    }
    
    console.log('\n✅ ลบ tables ที่ไม่ใช้เรียบร้อยแล้ว!');
    console.log('💾 ระบบใช้เพียง 2 tables: consent_records และ consent_history');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    pool.end();
  }
}

// รัน cleanup
cleanupUnusedTables().catch(console.error);
