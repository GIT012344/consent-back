const { Pool } = require('pg');
require('dotenv').config();

// Use local database configuration
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '4321',
  database: process.env.DB_NAME || 'consent'
});

async function restoreAllTables() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Starting to restore ALL 21 database tables...\n');
    
    // 1. Create tenants table
    console.log('Creating table 1/21: tenants...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS tenants (
        code VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        language VARCHAR(10) DEFAULT 'th',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // 2. Create policy_kinds table
    console.log('Creating table 2/21: policy_kinds...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS policy_kinds (
        id SERIAL PRIMARY KEY,
        code VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // 3. Create policies table
    console.log('Creating table 3/21: policies...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS policies (
        id SERIAL PRIMARY KEY,
        tenant_code VARCHAR(50) REFERENCES tenants(code),
        policy_kind_code VARCHAR(50) NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // 4. Create policy_versions table
    console.log('Creating table 4/21: policy_versions...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS policy_versions (
        id SERIAL PRIMARY KEY,
        policy_id INTEGER REFERENCES policies(id),
        version VARCHAR(50) NOT NULL,
        title VARCHAR(500) NOT NULL,
        content TEXT NOT NULL,
        language VARCHAR(10) NOT NULL,
        user_type VARCHAR(50),
        effective_date DATE,
        expiry_date DATE,
        is_mandatory BOOLEAN DEFAULT true,
        enforce_mode VARCHAR(50) DEFAULT 'strict',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(policy_id, version, language)
      )
    `);
    
    // 5. Create audiences table
    console.log('Creating table 5/21: audiences...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS audiences (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // 6. Create policy_version_audiences table
    console.log('Creating table 6/21: policy_version_audiences...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS policy_version_audiences (
        policy_version_id INTEGER REFERENCES policy_versions(id),
        audience_id INTEGER REFERENCES audiences(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (policy_version_id, audience_id)
      )
    `);
    
    // 7. Create users table
    console.log('Creating table 7/21: users...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        title VARCHAR(50),
        full_name VARCHAR(255) NOT NULL,
        id_passport VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // 8. Create consent_versions table
    console.log('Creating table 8/21: consent_versions...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS consent_versions (
        id SERIAL PRIMARY KEY,
        version VARCHAR(50) NOT NULL,
        language VARCHAR(10) DEFAULT 'th',
        user_type VARCHAR(50) DEFAULT 'customer',
        description TEXT,
        file_path VARCHAR(500),
        file_name VARCHAR(255),
        file_size VARCHAR(50),
        is_active BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by VARCHAR(255),
        UNIQUE(version, language)
      )
    `);
    
    // 9. Create consents table
    console.log('Creating table 9/21: consents...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS consents (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        consent_version_id INTEGER REFERENCES consent_versions(id),
        consent_given BOOLEAN DEFAULT false,
        consent_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ip_address VARCHAR(50),
        user_agent TEXT,
        status VARCHAR(50) DEFAULT 'active',
        withdrawn_date TIMESTAMP,
        expiry_date TIMESTAMP
      )
    `);
    
    // 10. Create consent_records table
    console.log('Creating table 10/21: consent_records...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS consent_records (
        id SERIAL PRIMARY KEY,
        title VARCHAR(10) NOT NULL,
        name_surname VARCHAR(255) NOT NULL,
        id_passport VARCHAR(50) NOT NULL,
        created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_time TIME DEFAULT CURRENT_TIME,
        ip_address VARCHAR(45),
        browser VARCHAR(500),
        consent_type VARCHAR(50) DEFAULT 'customer',
        user_type VARCHAR(50) DEFAULT 'customer',
        consent_language VARCHAR(10) DEFAULT 'th',
        consent_version VARCHAR(20) DEFAULT '1.0',
        is_active BOOLEAN DEFAULT TRUE,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // 11. Create consent_history table
    console.log('Creating table 11/21: consent_history...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS consent_history (
        id SERIAL PRIMARY KEY,
        id_passport VARCHAR(50) NOT NULL,
        title VARCHAR(50) NOT NULL,
        name_surname VARCHAR(255) NOT NULL,
        consent_version VARCHAR(20) NOT NULL,
        consent_version_id INTEGER,
        consent_type VARCHAR(50) DEFAULT 'customer',
        consent_language VARCHAR(10) DEFAULT 'th',
        user_type VARCHAR(50) DEFAULT 'customer',
        is_active BOOLEAN DEFAULT FALSE,
        created_date DATE DEFAULT CURRENT_DATE,
        created_time TIME DEFAULT CURRENT_TIME,
        ip_address VARCHAR(45),
        browser VARCHAR(500),
        action VARCHAR(50) DEFAULT 'consent_given',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // 12. Create consent_version_targeting table
    console.log('Creating table 12/21: consent_version_targeting...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS consent_version_targeting (
        id SERIAL PRIMARY KEY,
        id_passport VARCHAR(50) NOT NULL,
        consent_version_id INTEGER REFERENCES consent_versions(id),
        start_date TIMESTAMP,
        end_date TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by VARCHAR(255),
        is_active BOOLEAN DEFAULT true
      )
    `);
    
    // 13. Create form_templates table
    console.log('Creating table 13/21: form_templates...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS form_templates (
        id SERIAL PRIMARY KEY,
        user_type VARCHAR(50) NOT NULL,
        fields JSONB NOT NULL,
        consent_text TEXT,
        language VARCHAR(10) DEFAULT 'th',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by VARCHAR(255),
        UNIQUE(user_type, language, is_active)
      )
    `);
    
    // 14. Create consent_form_fields table
    console.log('Creating table 14/21: consent_form_fields...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS consent_form_fields (
        id SERIAL PRIMARY KEY,
        field_name VARCHAR(100) NOT NULL UNIQUE,
        field_label_th VARCHAR(255) NOT NULL,
        field_label_en VARCHAR(255) NOT NULL,
        field_type VARCHAR(50) NOT NULL DEFAULT 'text',
        is_required BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        display_order INTEGER DEFAULT 0,
        options JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // 15. Create consent_titles table
    console.log('Creating table 15/21: consent_titles...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS consent_titles (
        id SERIAL PRIMARY KEY,
        title_th VARCHAR(50) NOT NULL,
        title_en VARCHAR(50) NOT NULL,
        display_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // 16. Create admin_users table
    console.log('Creating table 16/21: admin_users...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(255),
        email VARCHAR(255),
        role VARCHAR(50) DEFAULT 'admin',
        is_active BOOLEAN DEFAULT true,
        last_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // 17. Create audit_logs table
    console.log('Creating table 17/21: audit_logs...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(100),
        entity_id INTEGER,
        user_id INTEGER,
        admin_id INTEGER,
        ip_address VARCHAR(50),
        details JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // 18. Create user_consents table
    console.log('Creating table 18/21: user_consents...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_consents (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        policy_version_id INTEGER REFERENCES policy_versions(id),
        consent_given BOOLEAN DEFAULT false,
        consent_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ip_address VARCHAR(50),
        user_agent TEXT,
        status VARCHAR(50) DEFAULT 'active',
        withdrawn_date TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // 19. Create consent_templates table
    console.log('Creating table 19/21: consent_templates...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS consent_templates (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        template_content TEXT,
        language VARCHAR(10) DEFAULT 'th',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // 20. Create consent_settings table
    console.log('Creating table 20/21: consent_settings...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS consent_settings (
        id SERIAL PRIMARY KEY,
        setting_key VARCHAR(100) UNIQUE NOT NULL,
        setting_value TEXT,
        setting_type VARCHAR(50) DEFAULT 'string',
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // 21. Create consent_attachments table
    console.log('Creating table 21/21: consent_attachments...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS consent_attachments (
        id SERIAL PRIMARY KEY,
        consent_id INTEGER REFERENCES consents(id),
        file_name VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        file_size INTEGER,
        file_type VARCHAR(100),
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        uploaded_by INTEGER REFERENCES users(id)
      )
    `);
    
    console.log('\n✅ All 21 tables created successfully!\n');
    
    // Create indexes for better performance
    console.log('Creating indexes for better performance...');
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_users_id_passport ON users(id_passport)',
      'CREATE INDEX IF NOT EXISTS idx_consents_user_id ON consents(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_consents_status ON consents(status)',
      'CREATE INDEX IF NOT EXISTS idx_consents_date ON consents(consent_date)',
      'CREATE INDEX IF NOT EXISTS idx_consent_records_id_passport ON consent_records(id_passport)',
      'CREATE INDEX IF NOT EXISTS idx_consent_history_id_passport ON consent_history(id_passport)',
      'CREATE INDEX IF NOT EXISTS idx_consent_history_version ON consent_history(consent_version)',
      'CREATE INDEX IF NOT EXISTS idx_targeting_id_passport ON consent_version_targeting(id_passport)',
      'CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id)',
      'CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_policy_versions_active ON policy_versions(is_active)',
      'CREATE INDEX IF NOT EXISTS idx_policy_versions_user_type ON policy_versions(user_type)'
    ];
    
    for (const index of indexes) {
      await client.query(index);
    }
    
    console.log('✅ All indexes created successfully!\n');
    
    // Insert default data
    console.log('Inserting default data...');
    
    // Insert default tenant
    await client.query(`
      INSERT INTO tenants (code, name, language) 
      VALUES ('default', 'Default Tenant', 'th')
      ON CONFLICT (code) DO NOTHING
    `);
    
    // Insert policy kinds
    await client.query(`
      INSERT INTO policy_kinds (code, name, description) 
      VALUES 
        ('privacy', 'Privacy Policy', 'Privacy and data protection policies'),
        ('consent', 'Consent Policy', 'General consent policies'),
        ('terms', 'Terms of Service', 'Terms and conditions'),
        ('cookies', 'Cookie Policy', 'Cookie usage policies'),
        ('marketing', 'Marketing Consent', 'Marketing and promotional consent')
      ON CONFLICT (code) DO NOTHING
    `);
    
    // Insert audiences
    await client.query(`
      INSERT INTO audiences (name, description)
      VALUES 
        ('customer', 'Customer users'),
        ('employee', 'Employee users'),
        ('partner', 'Partner users'),
        ('vendor', 'Vendor users'),
        ('public', 'Public users')
      ON CONFLICT (name) DO NOTHING
    `);
    
    // Insert default consent titles
    const titlesCheck = await client.query('SELECT COUNT(*) FROM consent_titles');
    if (titlesCheck.rows[0].count === '0') {
      await client.query(`
        INSERT INTO consent_titles (title_th, title_en, display_order)
        VALUES 
          ('นาย', 'Mr.', 1),
          ('นาง', 'Mrs.', 2),
          ('นางสาว', 'Ms.', 3),
          ('ดร.', 'Dr.', 4),
          ('ศ.', 'Prof.', 5),
          ('รศ.', 'Assoc. Prof.', 6),
          ('ผศ.', 'Asst. Prof.', 7)
      `);
    }
    
    // Insert default form fields
    const fieldsCheck = await client.query('SELECT COUNT(*) FROM consent_form_fields');
    if (fieldsCheck.rows[0].count === '0') {
      await client.query(`
        INSERT INTO consent_form_fields (field_name, field_label_th, field_label_en, field_type, is_required, display_order)
        VALUES 
          ('email', 'อีเมล', 'Email', 'email', false, 1),
          ('phone', 'เบอร์โทรศัพท์', 'Phone Number', 'phone', false, 2),
          ('address', 'ที่อยู่', 'Address', 'text', false, 3),
          ('birthdate', 'วันเกิด', 'Birth Date', 'date', false, 4),
          ('occupation', 'อาชีพ', 'Occupation', 'text', false, 5),
          ('company', 'บริษัท/องค์กร', 'Company/Organization', 'text', false, 6),
          ('department', 'แผนก', 'Department', 'text', false, 7)
      `);
    }
    
    // Insert default consent versions
    const versionCheck = await client.query('SELECT COUNT(*) FROM consent_versions');
    if (versionCheck.rows[0].count === '0') {
      await client.query(`
        INSERT INTO consent_versions (version, language, user_type, description, is_active)
        VALUES 
          ('1.0', 'th', 'customer', 'เวอร์ชันแรกของข้อกำหนดและเงื่อนไข', true),
          ('1.0', 'en', 'customer', 'Initial version of terms and conditions', true),
          ('1.0', 'th', 'employee', 'เวอร์ชันแรกสำหรับพนักงาน', true),
          ('1.0', 'en', 'employee', 'Initial version for employees', true),
          ('1.0', 'th', 'partner', 'เวอร์ชันแรกสำหรับพันธมิตร', true),
          ('1.0', 'en', 'partner', 'Initial version for partners', true)
      `);
    }
    
    // Insert default admin user
    const bcrypt = require('bcryptjs');
    const adminCheck = await client.query('SELECT COUNT(*) FROM admin_users WHERE username = $1', ['admin']);
    if (adminCheck.rows[0].count === '0') {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await client.query(`
        INSERT INTO admin_users (username, password_hash, full_name, email, role)
        VALUES ($1, $2, $3, $4, $5)
      `, ['admin', hashedPassword, 'System Administrator', 'admin@example.com', 'admin']);
    }
    
    console.log('✅ Default data inserted successfully!\n');
    
    // Show table count
    const tableCount = await client.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    `);
    
    console.log(`📊 Total tables in database: ${tableCount.rows[0].count}`);
    
    // List all tables
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    console.log('\n📋 All tables in database:');
    tables.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.table_name}`);
    });
    
    console.log('\n✅ Database restoration completed successfully!');
    console.log('   All 21 tables have been created with indexes and default data.');
    
  } catch (error) {
    console.error('❌ Error restoring tables:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the restoration
restoreAllTables().catch(console.error);
