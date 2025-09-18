const { Pool } = require('pg');
require('dotenv').config();

// Database configuration - Support for Render DATABASE_URL
let dbConfig;

if (process.env.DATABASE_URL) {
  // Use DATABASE_URL if available (for Render deployment)
  dbConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? {
      rejectUnauthorized: false // Required for Render PostgreSQL
    } : false,
    connectionTimeoutMillis: 30000, // Increased timeout
    idleTimeoutMillis: 10000, // Reduced idle timeout to prevent stale connections
    max: 20, // Increased pool size
    min: 2, // Minimum connections to maintain
    statement_timeout: 60000,
    query_timeout: 60000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000
  };
} else {
  // Fallback to individual environment variables (for local development)
  dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '4321',
    database: process.env.DB_NAME || 'consent',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    acquireTimeout: 60000,
    timeout: 60000,
    reconnect: true
  };
}

// Create connection pool with error handling
const pool = new Pool(dbConfig);

// Handle pool errors
pool.on('error', (err, client) => {
  console.error('Unexpected pool error:', err);
});

// Handle connection events
pool.on('connect', (client) => {
  console.log('✅ New database connection established');
});

pool.on('remove', (client) => {
  console.log('⚠️ Database connection removed from pool');
});

// Test database connection
const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log('✅ Database connected successfully');
    client.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
};

// Initialize database and tables
const initializeDatabase = async () => {
  try {
    const client = await pool.connect();
    
    // 1. Create users table
    const createUsersTable = `
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
    `;
    await client.query(createUsersTable);
    
    // 2. Create consent_versions table
    const createConsentVersionsTable = `
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
    `;
    await client.query(createConsentVersionsTable);
    
    // 3. Create consents table
    const createConsentsTable = `
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
    `; 
    await client.query(createConsentsTable);
    
    // 4. Create consent_version_targeting table
    const createTargetingTable = `
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
    `;
    await client.query(createTargetingTable);
    
    // 5. Create admin_users table
    const createAdminUsersTable = `
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
    `;
    await client.query(createAdminUsersTable);
    
    // 6. Create audit_logs table
    const createAuditLogsTable = `
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
    `;
    await client.query(createAuditLogsTable);
    
    // Create indexes for better performance
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_users_id_passport ON users(id_passport)',
      'CREATE INDEX IF NOT EXISTS idx_consents_user_id ON consents(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_consents_status ON consents(status)',
      'CREATE INDEX IF NOT EXISTS idx_consents_date ON consents(consent_date)',
      'CREATE INDEX IF NOT EXISTS idx_targeting_id_passport ON consent_version_targeting(id_passport)',
      'CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id)',
      'CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at)'
    ];
    
    for (const index of indexes) {
      await client.query(index);
    }
    
    // Keep the old consent_records table for backward compatibility
    const createConsentRecordsTable = `
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
    `;
    await client.query(createConsentRecordsTable);
    
    // Create consent_history table for tracking all versions
    const createConsentHistoryTable = `
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
    `;
    await client.query(createConsentHistoryTable);
    
    // Create index for faster queries
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_consent_history_id_passport 
      ON consent_history(id_passport)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_consent_history_version 
      ON consent_history(consent_version)
    `);
    
    // Create form_templates table
    const createFormTemplatesTable = `
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
    `;
    await client.query(createFormTemplatesTable);
    
    // Create consent_form_fields table
    const createFormFieldsTable = `
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
    `;
    await client.query(createFormFieldsTable);
    
    // Create consent_titles table
    const createTitlesTable = `
      CREATE TABLE IF NOT EXISTS consent_titles (
        id SERIAL PRIMARY KEY,
        title_th VARCHAR(50) NOT NULL,
        title_en VARCHAR(50) NOT NULL,
        display_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await client.query(createTitlesTable);
    
    // Insert default form fields if not exists
    const fieldsCheck = await client.query('SELECT COUNT(*) FROM consent_form_fields');
    if (fieldsCheck.rows[0].count === '0') {
      await client.query(`
        INSERT INTO consent_form_fields (field_name, field_label_th, field_label_en, field_type, is_required, display_order)
        VALUES 
          ('email', 'อีเมล', 'Email', 'email', false, 1),
          ('phone', 'เบอร์โทรศัพท์', 'Phone Number', 'phone', false, 2),
          ('address', 'ที่อยู่', 'Address', 'text', false, 3),
          ('birthdate', 'วันเกิด', 'Birth Date', 'date', false, 4),
          ('occupation', 'อาชีพ', 'Occupation', 'text', false, 5)
      `);
    }
    
    // Insert default titles if not exists
    const titlesCheck = await client.query('SELECT COUNT(*) FROM consent_titles');
    if (titlesCheck.rows[0].count === '0') {
      await client.query(`
        INSERT INTO consent_titles (title_th, title_en, display_order)
        VALUES 
          ('นาย', 'Mr.', 1),
          ('นาง', 'Mrs.', 2),
          ('นางสาว', 'Ms.', 3),
          ('ดร.', 'Dr.', 4),
          ('ศ.', 'Prof.', 5)
      `);
    }
    
    // Insert default admin user if not exists
    const bcrypt = require('bcryptjs');
    const defaultPassword = await bcrypt.hash(process.env.DEFAULT_ADMIN_PASSWORD || 'admin123', 10);
    
    // Check if admin exists first
    const adminCheck = await client.query(
      'SELECT id FROM admin_users WHERE username = $1',
      [process.env.DEFAULT_ADMIN_USERNAME || 'admin']
    );
    
    if (adminCheck.rows.length === 0) {
      await client.query(`
        INSERT INTO admin_users (username, password_hash, full_name, email, role)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        process.env.DEFAULT_ADMIN_USERNAME || 'admin',
        defaultPassword,
        'System Administrator',
        'admin@example.com',
        'admin'
      ]);
    }
    
    // Create policy management tables
    const createTenantsTable = `
      CREATE TABLE IF NOT EXISTS tenants (
        code VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        language VARCHAR(10) DEFAULT 'th',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await client.query(createTenantsTable);
    
    const createPolicyKindsTable = `
      CREATE TABLE IF NOT EXISTS policy_kinds (
        id SERIAL PRIMARY KEY,
        code VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await client.query(createPolicyKindsTable);
    
    const createPoliciesTable = `
      CREATE TABLE IF NOT EXISTS policies (
        id SERIAL PRIMARY KEY,
        tenant_code VARCHAR(50) REFERENCES tenants(code),
        policy_kind_code VARCHAR(50) NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await client.query(createPoliciesTable);
    
    const createPolicyVersionsTable = `
      CREATE TABLE IF NOT EXISTS policy_versions (
        id SERIAL PRIMARY KEY,
        policy_id INTEGER REFERENCES policies(id),
        version VARCHAR(50) NOT NULL,
        title VARCHAR(500) NOT NULL,
        content TEXT NOT NULL,
        language VARCHAR(10) NOT NULL,
        effective_date DATE NOT NULL,
        expiry_date DATE,
        is_mandatory BOOLEAN DEFAULT true,
        enforce_mode VARCHAR(50) DEFAULT 'strict',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(policy_id, version, language)
      )
    `;
    await client.query(createPolicyVersionsTable);
    
    const createAudiencesTable = `
      CREATE TABLE IF NOT EXISTS audiences (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await client.query(createAudiencesTable);
    
    const createPolicyVersionAudiencesTable = `
      CREATE TABLE IF NOT EXISTS policy_version_audiences (
        policy_version_id INTEGER REFERENCES policy_versions(id),
        audience_id INTEGER REFERENCES audiences(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (policy_version_id, audience_id)
      )
    `;
    await client.query(createPolicyVersionAudiencesTable);
    
    // Insert default policy data
    await client.query(`
      INSERT INTO tenants (code, name, language) 
      VALUES ('default', 'Default Tenant', 'th')
      ON CONFLICT (code) DO NOTHING
    `);
    
    await client.query(`
      INSERT INTO policy_kinds (code, name, description) 
      VALUES 
        ('privacy', 'Privacy Policy', 'Privacy and data protection policies'),
        ('consent', 'Consent Policy', 'General consent policies'),
        ('terms', 'Terms of Service', 'Terms and conditions')
      ON CONFLICT (code) DO NOTHING
    `);
    
    await client.query(`
      INSERT INTO audiences (name, description)
      VALUES 
        ('customer', 'Customer users'),
        ('employee', 'Employee users'),
        ('partner', 'Partner users'),
        ('public', 'Public users')
      ON CONFLICT (name) DO NOTHING
    `);
    
    // Insert default consent versions if not exists
    const versionCheckTh = await client.query(
      'SELECT id FROM consent_versions WHERE version = $1 AND language = $2',
      ['1.0', 'th']
    );
    
    if (versionCheckTh.rows.length === 0) {
      await client.query(`
        INSERT INTO consent_versions (version, language, description, is_active)
        VALUES ('1.0', 'th', 'เวอร์ชันแรกของข้อกำหนดและเงื่อนไข', true)
      `);
    }
    
    const versionCheckEn = await client.query(
      'SELECT id FROM consent_versions WHERE version = $1 AND language = $2',
      ['1.0', 'en']
    );
    
    if (versionCheckEn.rows.length === 0) {
      await client.query(`
        INSERT INTO consent_versions (version, language, description, is_active)
        VALUES ('1.0', 'en', 'Initial version of terms and conditions', true)
      `);
    }
    
    client.release();
    console.log('✅ Database tables initialized successfully');
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    throw error;
  }
};

module.exports = pool;
module.exports.pool = pool;
module.exports.testConnection = testConnection;
module.exports.initializeDatabase = initializeDatabase;
