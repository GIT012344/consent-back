const { pool } = require('../config/database');

const initializeDatabase = async () => {
  try {
    // Check if tables exist
    const checkTables = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'consent_records'
      ) as consent_exists,
      EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'simple_policy'
      ) as policy_exists;
    `;
    
    const result = await pool.query(checkTables);
    
    // Create consent_records table if not exists
    if (!result.rows[0].consent_exists) {
      const createConsentTable = `
        CREATE TABLE IF NOT EXISTS consent_records (
          id SERIAL PRIMARY KEY,
          uid VARCHAR(50) UNIQUE DEFAULT gen_random_uuid(),
          title VARCHAR(100),
          name_surname VARCHAR(500) NOT NULL,
          id_passport VARCHAR(100) NOT NULL,
          email VARCHAR(255),
          phone VARCHAR(50),
          consent_type VARCHAR(100) DEFAULT 'general',
          user_type VARCHAR(100) DEFAULT 'customer',
          consent_language VARCHAR(10) DEFAULT 'th',
          consent_version VARCHAR(100),
          consent_version_id INTEGER,
          consent_date DATE DEFAULT CURRENT_DATE,
          consent_time TIME DEFAULT CURRENT_TIME,
          created_date DATE DEFAULT CURRENT_DATE,
          created_time TIME DEFAULT CURRENT_TIME,
          ip_address VARCHAR(100),
          browser_info TEXT,
          is_active BOOLEAN DEFAULT TRUE,
          status VARCHAR(50) DEFAULT 'active',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `;
      await pool.query(createConsentTable);
      console.log('✅ Created consent_records table');
    }
    
    // Create simple_policy table if not exists
    if (!result.rows[0].policy_exists) {
      const createPolicyTable = `
        CREATE TABLE IF NOT EXISTS simple_policy (
          id SERIAL PRIMARY KEY,
          version VARCHAR(50) NOT NULL,
          title VARCHAR(500),
          content TEXT NOT NULL,
          language VARCHAR(10) DEFAULT 'th',
          user_type VARCHAR(100) DEFAULT 'customer',
          effective_date DATE DEFAULT CURRENT_DATE,
          expiry_date DATE,
          is_active BOOLEAN DEFAULT TRUE,
          is_mandatory BOOLEAN DEFAULT FALSE,
          enforce_mode VARCHAR(50) DEFAULT 'strict',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `;
      await pool.query(createPolicyTable);
      console.log('✅ Created simple_policy table');
    }
    
    // Create consent_history table if not exists
    const createHistoryTable = `
      CREATE TABLE IF NOT EXISTS consent_history (
        id SERIAL PRIMARY KEY,
        id_passport VARCHAR(100) NOT NULL,
        name_surname VARCHAR(500),
        consent_version VARCHAR(100),
        consent_type VARCHAR(100),
        user_type VARCHAR(100),
        consent_language VARCHAR(10),
        action VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await pool.query(createHistoryTable);
    
    // Create user_types table if not exists
    const createUserTypesTable = `
      CREATE TABLE IF NOT EXISTS user_types (
        id SERIAL PRIMARY KEY,
        type_code VARCHAR(50) UNIQUE NOT NULL,
        type_name VARCHAR(100) NOT NULL,
        type_name_th VARCHAR(100),
        description TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await pool.query(createUserTypesTable);
    
    // Insert default user types if not exists
    const insertDefaultTypes = `
      INSERT INTO user_types (type_code, type_name, type_name_th) 
      VALUES 
        ('customer', 'Customer', 'ลูกค้า'),
        ('employee', 'Employee', 'พนักงาน'),
        ('partner', 'Partner', 'พาร์ทเนอร์')
      ON CONFLICT (type_code) DO NOTHING;
    `;
    await pool.query(insertDefaultTypes);
    
    // Create form_fields table if not exists
    const createFormFieldsTable = `
      CREATE TABLE IF NOT EXISTS form_fields (
        id SERIAL PRIMARY KEY,
        field_name VARCHAR(100) NOT NULL,
        field_label VARCHAR(255),
        field_type VARCHAR(50),
        is_required BOOLEAN DEFAULT FALSE,
        field_order INTEGER,
        user_type VARCHAR(100),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await pool.query(createFormFieldsTable);
    
    // Create titles table if not exists
    const createTitlesTable = `
      CREATE TABLE IF NOT EXISTS titles (
        id SERIAL PRIMARY KEY,
        title_th VARCHAR(50),
        title_en VARCHAR(50),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await pool.query(createTitlesTable);
    
    // Insert default titles if not exists
    const insertDefaultTitles = `
      INSERT INTO titles (title_th, title_en) 
      VALUES 
        ('นาย', 'Mr.'),
        ('นาง', 'Mrs.'),
        ('นางสาว', 'Ms.')
      ON CONFLICT DO NOTHING;
    `;
    await pool.query(insertDefaultTitles);
    
    console.log('✅ Database initialization complete');
    
  } catch (error) {
    console.error('❌ Database initialization error:', error.message);
    throw error;
  }
};

module.exports = initializeDatabase;
