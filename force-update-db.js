const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'consent',
  user: 'postgres',
  password: '4321'
});

async function forceUpdateDb() {
  try {
    console.log('🔧 บังคับอัพเดท UserType ในฐานข้อมูล...\n');
    
    // อัพเดทโดยตรงตาม title
    const updates = [
      {
        condition: "title LIKE '%พนักงาน%'",
        userType: 'employee',
        name: 'พนักงาน'
      },
      {
        condition: "title LIKE '%พันธมิตร%'",
        userType: 'partner',
        name: 'พันธมิตร'
      },
      {
        condition: "title LIKE '%ผู้ขาย%'",
        userType: 'vendor',
        name: 'ผู้ขาย'
      },
      {
        condition: "title LIKE '%ผู้รับเหมา%'",
        userType: 'contractor',
        name: 'ผู้รับเหมา'
      }
    ];
    
    for (const update of updates) {
      const result = await pool.query(`
        UPDATE policy_versions 
        SET user_type = $1
        WHERE ${update.condition}
        RETURNING id, version, title
      `, [update.userType]);
      
      if (result.rows.length > 0) {
        result.rows.forEach(p => {
          console.log(`✅ แก้ไข [${p.version}] "${p.title}" -> ${update.userType}`);
        });
      }
    }
    
    // ตรวจสอบผลลัพธ์
    console.log('\n📊 ผลลัพธ์:');
    const final = await pool.query(`
      SELECT version, user_type, title
      FROM policy_versions
      ORDER BY version
    `);
    
    console.log('\nVersion | UserType  | Title');
    console.log('--------|-----------|------');
    final.rows.forEach(p => {
      console.log(`${p.version}    | ${p.user_type.padEnd(9)} | ${p.title}`);
    });
    
    // สรุปลิงก์
    console.log('\n📌 ลิงก์ที่ควรแสดง:');
    final.rows.forEach(p => {
      let link = p.user_type === 'customer' 
        ? '/consent/select-language'
        : `/consent/${p.user_type}?lang=th`;
      console.log(`${p.version}: ${link}`);
    });
    
    console.log('\n✅ เสร็จสิ้น!');
    console.log('⚠️ รีสตาร์ท Backend และ Hard Refresh (Ctrl+Shift+R)');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

forceUpdateDb();
