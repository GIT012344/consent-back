const pool = require('./db');

async function seedRealData() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // 1. Create consent_versions table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS consent_versions (
        id SERIAL PRIMARY KEY,
        version VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        content TEXT,
        language VARCHAR(10) DEFAULT 'th',
        user_type VARCHAR(50) DEFAULT 'customer',
        is_active BOOLEAN DEFAULT true,
        file_path VARCHAR(500),
        file_size INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Insert real consent versions
    const versions = [
      {
        version: '1.0',
        title: 'นโยบายความเป็นส่วนตัว',
        description: 'นโยบายความเป็นส่วนตัวสำหรับลูกค้าทั่วไป',
        content: `
          <h2>นโยบายความเป็นส่วนตัว</h2>
          <p>บริษัทให้ความสำคัญกับการคุ้มครองข้อมูลส่วนบุคคลของท่าน โดยนโยบายความเป็นส่วนตัวนี้จะอธิบายถึง:</p>
          <ul>
            <li>ข้อมูลที่เราเก็บรวบรวม</li>
            <li>วัตถุประสงค์ในการใช้ข้อมูล</li>
            <li>การเปิดเผยข้อมูลต่อบุคคลที่สาม</li>
            <li>การรักษาความปลอดภัยของข้อมูล</li>
            <li>สิทธิของเจ้าของข้อมูล</li>
          </ul>
          <h3>1. ข้อมูลที่เราเก็บรวบรวม</h3>
          <p>เราเก็บรวบรวมข้อมูลส่วนบุคคลที่จำเป็นสำหรับการให้บริการ ได้แก่ ชื่อ-นามสกุล, เลขบัตรประชาชน, อีเมล, เบอร์โทรศัพท์</p>
          <h3>2. วัตถุประสงค์</h3>
          <p>เพื่อยืนยันตัวตน, ติดต่อสื่อสาร, และปรับปรุงการให้บริการ</p>
        `,
        language: 'th',
        user_type: 'customer',
        is_active: true
      },
      {
        version: '1.0',
        title: 'Privacy Policy',
        description: 'Privacy policy for general customers',
        content: `
          <h2>Privacy Policy</h2>
          <p>We value the protection of your personal data. This privacy policy explains:</p>
          <ul>
            <li>Information we collect</li>
            <li>Purpose of data usage</li>
            <li>Disclosure to third parties</li>
            <li>Data security</li>
            <li>Your rights</li>
          </ul>
          <h3>1. Information We Collect</h3>
          <p>We collect necessary personal information including: name, ID number, email, phone number</p>
          <h3>2. Purpose</h3>
          <p>For identity verification, communication, and service improvement</p>
        `,
        language: 'en',
        user_type: 'customer',
        is_active: true
      },
      {
        version: '2.0',
        title: 'นโยบายความเป็นส่วนตัวสำหรับพนักงาน',
        description: 'นโยบายความเป็นส่วนตัวเฉพาะสำหรับพนักงาน',
        content: `
          <h2>นโยบายความเป็นส่วนตัวสำหรับพนักงาน</h2>
          <p>นโยบายนี้ใช้กับพนักงานและบุคลากรภายในองค์กร</p>
          <h3>ข้อมูลที่เก็บรวบรวม</h3>
          <ul>
            <li>ข้อมูลส่วนบุคคล: ชื่อ-นามสกุล, รหัสพนักงาน</li>
            <li>ข้อมูลการทำงาน: ตำแหน่ง, แผนก, ประวัติการทำงาน</li>
            <li>ข้อมูลการติดต่อ: อีเมลองค์กร, เบอร์โทรภายใน</li>
          </ul>
          <h3>การใช้ข้อมูล</h3>
          <p>เพื่อการบริหารทรัพยากรบุคคล, การจ่ายเงินเดือน, และการพัฒนาบุคลากร</p>
        `,
        language: 'th',
        user_type: 'employee',
        is_active: true
      },
      {
        version: '1.5',
        title: 'นโยบายความเป็นส่วนตัวสำหรับพาร์ทเนอร์',
        description: 'นโยบายความเป็นส่วนตัวสำหรับพันธมิตรทางธุรกิจ',
        content: `
          <h2>นโยบายความเป็นส่วนตัวสำหรับพาร์ทเนอร์</h2>
          <p>นโยบายนี้ใช้กับพันธมิตรและคู่ค้าทางธุรกิจ</p>
          <h3>ข้อมูลที่เก็บ</h3>
          <ul>
            <li>ข้อมูลบริษัท: ชื่อบริษัท, เลขทะเบียน</li>
            <li>ข้อมูลผู้ติดต่อ: ชื่อ, ตำแหน่ง, อีเมล, เบอร์โทร</li>
            <li>ข้อมูลทางธุรกิจ: ประเภทธุรกิจ, ขอบเขตความร่วมมือ</li>
          </ul>
        `,
        language: 'th',
        user_type: 'partner',
        is_active: true
      }
    ];

    // Insert versions
    for (const version of versions) {
      await client.query(`
        INSERT INTO consent_versions 
        (version, title, description, content, language, user_type, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT DO NOTHING
      `, [
        version.version,
        version.title,
        version.description,
        version.content,
        version.language,
        version.user_type,
        version.is_active
      ]);
    }

    // 3. Create and seed consent_titles table
    await client.query(`
      CREATE TABLE IF NOT EXISTS consent_titles (
        id SERIAL PRIMARY KEY,
        title_th VARCHAR(50) NOT NULL,
        title_en VARCHAR(50),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const titles = [
      { title_th: 'นาย', title_en: 'Mr.' },
      { title_th: 'นาง', title_en: 'Mrs.' },
      { title_th: 'นางสาว', title_en: 'Ms.' },
      { title_th: 'ดร.', title_en: 'Dr.' },
      { title_th: 'ศ.', title_en: 'Prof.' }
    ];

    for (const title of titles) {
      await client.query(`
        INSERT INTO consent_titles (title_th, title_en, is_active)
        VALUES ($1, $2, true)
        ON CONFLICT DO NOTHING
      `, [title.title_th, title.title_en]);
    }

    // 4. Create and seed consent_form_fields table
    await client.query(`
      CREATE TABLE IF NOT EXISTS consent_form_fields (
        id SERIAL PRIMARY KEY,
        field_name VARCHAR(100) NOT NULL,
        field_label VARCHAR(255) NOT NULL,
        field_type VARCHAR(50) NOT NULL,
        is_required BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        display_order INTEGER DEFAULT 0,
        options JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const formFields = [
      {
        field_name: 'idNumber',
        field_label: 'เลขบัตรประชาชน / หนังสือเดินทาง',
        field_type: 'text',
        is_required: true,
        display_order: 1
      },
      {
        field_name: 'email',
        field_label: 'อีเมล',
        field_type: 'email',
        is_required: false,
        display_order: 2
      },
      {
        field_name: 'phone',
        field_label: 'เบอร์โทรศัพท์',
        field_type: 'tel',
        is_required: false,
        display_order: 3
      },
      {
        field_name: 'address',
        field_label: 'ที่อยู่',
        field_type: 'textarea',
        is_required: false,
        display_order: 4
      }
    ];

    for (const field of formFields) {
      await client.query(`
        INSERT INTO consent_form_fields 
        (field_name, field_label, field_type, is_required, is_active, display_order)
        VALUES ($1, $2, $3, $4, true, $5)
        ON CONFLICT DO NOTHING
      `, [
        field.field_name,
        field.field_label,
        field.field_type,
        field.is_required,
        field.display_order
      ]);
    }

    // 5. Create consent_history table
    await client.query(`
      CREATE TABLE IF NOT EXISTS consent_history (
        id SERIAL PRIMARY KEY,
        user_id_hash VARCHAR(255) NOT NULL,
        id_number VARCHAR(50) NOT NULL,
        title VARCHAR(50),
        first_name VARCHAR(255) NOT NULL,
        last_name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(20),
        consent_ref VARCHAR(50) UNIQUE NOT NULL,
        policy_version_id INTEGER,
        policy_type VARCHAR(50),
        policy_version VARCHAR(20),
        language VARCHAR(10),
        audience VARCHAR(50),
        action VARCHAR(20) NOT NULL,
        ip_address VARCHAR(45),
        user_agent TEXT,
        consented_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP
      )
    `);

    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_user_hash ON consent_history(user_id_hash);
      CREATE INDEX IF NOT EXISTS idx_id_number ON consent_history(id_number);
      CREATE INDEX IF NOT EXISTS idx_consent_ref ON consent_history(consent_ref);
      CREATE INDEX IF NOT EXISTS idx_consented_at ON consent_history(consented_at DESC);
    `);

    await client.query('COMMIT');
    
    console.log('✅ Database seeded with real data successfully!');
    console.log('📊 Created tables:');
    console.log('   - consent_versions (4 versions)');
    console.log('   - consent_titles (5 titles)');
    console.log('   - consent_form_fields (4 fields)');
    console.log('   - consent_history (ready for data)');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run seeding
seedRealData()
  .then(() => {
    console.log('✅ Seeding completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  });
