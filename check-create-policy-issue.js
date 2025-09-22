const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '4321',
  database: 'consent'
});

async function checkCreatePolicyIssue() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 ตรวจสอบปัญหาการสร้าง Policy\n');
    console.log('='.repeat(50));
    
    // 1. ดู policies ทั้งหมดในฐานข้อมูล
    console.log('\n📊 Policies ทั้งหมดในฐานข้อมูล:');
    const allPolicies = await client.query(`
      SELECT id, user_type, language, title, is_active, created_at
      FROM policy_versions
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    if (allPolicies.rows.length === 0) {
      console.log('   ❌ ไม่พบ policy ในฐานข้อมูล');
    } else {
      allPolicies.rows.forEach(p => {
        const status = p.is_active ? '✅ Active' : '❌ Inactive';
        console.log(`   ID ${p.id}: ${p.user_type}/${p.language} = "${p.title}" ${status}`);
        console.log(`      Created: ${new Date(p.created_at).toLocaleString('th-TH')}`);
      });
    }
    
    // 2. ตรวจสอบ duplicate titles
    console.log('\n🔍 ตรวจสอบ Duplicate Titles:');
    const duplicates = await client.query(`
      SELECT title, COUNT(*) as count, 
             STRING_AGG(CONCAT(user_type, '/', language), ', ') as combinations
      FROM policy_versions
      WHERE title IN ('001', '002', '003', '01')
      GROUP BY title
      HAVING COUNT(*) > 1
    `);
    
    if (duplicates.rows.length > 0) {
      console.log('   ⚠️ พบ title ซ้ำ:');
      duplicates.rows.forEach(d => {
        console.log(`   "${d.title}" มี ${d.count} รายการ: ${d.combinations}`);
      });
    } else {
      console.log('   ✅ ไม่พบ title ซ้ำ');
    }
    
    // 3. ลบ policies ที่ซ้ำหรือไม่ active
    console.log('\n🗑️ ลบ policies เก่าที่ไม่ใช้:');
    
    // Keep only the latest active policy for each user_type/language combination
    await client.query(`
      DELETE FROM policy_versions
      WHERE id NOT IN (
        SELECT DISTINCT ON (user_type, language) id
        FROM policy_versions
        WHERE is_active = true
        ORDER BY user_type, language, created_at DESC
      )
    `);
    
    console.log('   ✅ ลบ policies ที่ไม่ใช้แล้ว');
    
    // 4. แสดง policies ที่เหลือ
    console.log('\n📋 Policies ที่ใช้งานอยู่:');
    const activePolicies = await client.query(`
      SELECT user_type, language, title
      FROM policy_versions
      WHERE is_active = true
      ORDER BY user_type, language
    `);
    
    activePolicies.rows.forEach(p => {
      console.log(`   ✅ ${p.user_type}/${p.language}: "${p.title}"`);
    });
    
    console.log('\n' + '='.repeat(50));
    console.log('💡 คำแนะนำ:');
    console.log('1. ลองสร้าง policy ใหม่ผ่าน: http://localhost:5000/admin/create-policy');
    console.log('2. ตรวจสอบว่า Backend รันอยู่ที่ port 3000');
    console.log('3. ดู console ใน browser ว่ามี error หรือไม่');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

checkCreatePolicyIssue();
