const { pool } = require('./config/database');

async function checkPolicies() {
  try {
    console.log('=== ตรวจสอบ Policy ทั้งหมดใน Database ===\n');
    
    // 1. ดูทั้งหมดที่มี
    const allPolicies = await pool.query(`
      SELECT 
        id,
        version,
        title,
        language,
        user_type,
        is_active,
        created_at
      FROM consent_versions 
      ORDER BY user_type, language, is_active DESC, created_at DESC
    `);
    
    console.log(`พบ Policy ทั้งหมด: ${allPolicies.rows.length} รายการ\n`);
    console.log('รายละเอียด:');
    console.log('─'.repeat(80));
    
    allPolicies.rows.forEach(row => {
      console.log(`[${row.is_active ? '✅ ACTIVE' : '❌ INACTIVE'}] ${row.user_type} + ${row.language}`);
      console.log(`  Title: ${row.title}`);
      console.log(`  Version: ${row.version}`);
      console.log(`  ID: ${row.id}`);
      console.log(`  Created: ${new Date(row.created_at).toLocaleString('th-TH')}`);
      console.log('─'.repeat(80));
    });
    
    // 2. สรุป Active Policies
    console.log('\n=== สรุป ACTIVE Policies ===');
    const activeSummary = await pool.query(`
      SELECT 
        user_type,
        language,
        COUNT(*) as count,
        STRING_AGG(title || ' (v' || version || ')', ', ') as policies
      FROM consent_versions 
      WHERE is_active = true
      GROUP BY user_type, language
      ORDER BY user_type, language
    `);
    
    if (activeSummary.rows.length === 0) {
      console.log('❌ ไม่มี Active Policy เลย!');
    } else {
      console.log('\nActive Policies ที่มี:');
      activeSummary.rows.forEach(row => {
        const warn = row.count > 1 ? ' ⚠️ (มีหลายตัว!)' : '';
        console.log(`• ${row.user_type} + ${row.language}: ${row.count} policy${warn}`);
        console.log(`  → ${row.policies}`);
      });
    }
    
    // 3. ตรวจสอบ Combination ที่ขาด
    console.log('\n=== ตรวจสอบ Combination ที่ยังไม่มี ===');
    const userTypes = ['customer', 'employee', 'partner'];
    const languages = ['th', 'en'];
    
    console.log('\nCombination ที่ควรมี:');
    for (const ut of userTypes) {
      for (const lang of languages) {
        const check = await pool.query(
          'SELECT COUNT(*) as count FROM consent_versions WHERE user_type = $1 AND language = $2 AND is_active = true',
          [ut, lang]
        );
        const hasPolicy = check.rows[0].count > 0;
        const status = hasPolicy ? '✅' : '❌';
        console.log(`${status} ${ut} + ${lang} ${hasPolicy ? '(มีแล้ว)' : '(ยังไม่มี)'}`);
      }
    }
    
    // 4. ตรวจสอบข้อมูลใน consent_records
    console.log('\n=== ข้อมูล Consent Records ===');
    const recordStats = await pool.query(`
      SELECT 
        user_type,
        COUNT(*) as count
      FROM consent_records
      GROUP BY user_type
      ORDER BY user_type
    `);
    
    if (recordStats.rows.length === 0) {
      console.log('ยังไม่มีการบันทึก consent');
    } else {
      console.log('จำนวน consent ที่บันทึกแล้ว:');
      recordStats.rows.forEach(row => {
        console.log(`• ${row.user_type}: ${row.count} รายการ`);
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkPolicies();
