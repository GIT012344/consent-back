const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '4321',
  database: 'consent'
});

async function checkUserTypeIssue() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 ตรวจสอบปัญหา User Type ใน Consent Records\n');
    console.log('='.repeat(80));
    
    // 1. ดู consent records ทั้งหมด
    console.log('1. Consent Records ในฐานข้อมูล:\n');
    const records = await client.query(`
      SELECT id, name_surname, id_passport, user_type, consent_version, 
             language, created_at
      FROM consent_records
      WHERE is_active = true
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    if (records.rows.length === 0) {
      console.log('ไม่พบ consent records');
    } else {
      records.rows.forEach(r => {
        console.log(`ID ${r.id}: ${r.name_surname}`);
        console.log(`   User Type: "${r.user_type}" (ควรเป็น custom type ที่สร้าง)`);
        console.log(`   ID/Passport: ${r.id_passport}`);
        console.log(`   Version: ${r.consent_version}`);
        console.log(`   Created: ${new Date(r.created_at).toLocaleString('th-TH')}`);
        console.log('');
      });
    }
    
    // 2. ดู policy versions ที่มี custom user types
    console.log('2. Policy Versions with Custom User Types:\n');
    const policies = await client.query(`
      SELECT DISTINCT user_type, COUNT(*) as count
      FROM policy_versions
      WHERE is_active = true
      GROUP BY user_type
      ORDER BY user_type
    `);
    
    policies.rows.forEach(p => {
      console.log(`   ${p.user_type}: ${p.count} policies`);
    });
    
    // 3. ตรวจสอบ consent records ที่ user_type ไม่ตรงกับ policy
    console.log('\n3. ตรวจสอบความสอดคล้อง:\n');
    const mismatch = await client.query(`
      SELECT cr.id, cr.name_surname, cr.user_type as record_type,
             pv.user_type as policy_type, pv.title
      FROM consent_records cr
      LEFT JOIN policy_versions pv ON pv.version = cr.consent_version
      WHERE cr.is_active = true
      ORDER BY cr.created_at DESC
      LIMIT 5
    `);
    
    if (mismatch.rows.length > 0) {
      mismatch.rows.forEach(m => {
        console.log(`Record ID ${m.id}: ${m.name_surname}`);
        console.log(`   Record User Type: "${m.record_type}"`);
        console.log(`   Policy User Type: "${m.policy_type}"`);
        if (m.record_type !== m.policy_type) {
          console.log(`   ⚠️ User Type ไม่ตรงกัน!`);
        }
        console.log('');
      });
    }
    
    console.log('='.repeat(80));
    console.log('\n💡 วิธีแก้ไข:\n');
    console.log('ปัญหาคือ: เมื่อสร้าง Policy ด้วย custom user type (เช่น "ไทล")');
    console.log('แต่ตอนบันทึก consent อาจถูกบันทึกเป็น "customer" แทน');
    console.log('\nต้องตรวจสอบ:');
    console.log('1. ConsentFlowPage.js - ตอนส่งข้อมูลไป API');
    console.log('2. Backend /api/consent/submit - ตอนบันทึก user_type');
    console.log('3. URL parameter ต้องส่ง user type ที่ถูกต้อง');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

checkUserTypeIssue();
