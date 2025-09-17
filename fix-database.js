const pool = require('./config/database');
const fs = require('fs');
const path = require('path');

async function fixTables() {
  try {
    console.log('🔧 Fixing database tables...\n');
    
    // Read SQL file
    const sqlPath = path.join(__dirname, 'fix-tables.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute SQL
    await pool.query(sql);
    
    console.log('✅ Tables fixed successfully!');
    console.log('📋 consent_titles - recreated with correct structure');
    console.log('📋 consent_form_fields - verified/created');
    
    // Verify the fix
    const titlesCount = await pool.query('SELECT COUNT(*) FROM consent_titles');
    const fieldsCount = await pool.query('SELECT COUNT(*) FROM consent_form_fields');
    
    console.log(`\n📊 Data counts:`);
    console.log(`   - Titles: ${titlesCount.rows[0].count}`);
    console.log(`   - Form fields: ${fieldsCount.rows[0].count}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing tables:', error.message);
    process.exit(1);
  }
}

fixTables();

async function fixDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Fixing database schema...');
    
    // Drop and recreate tables to ensure correct schema
    await client.query(`
      DROP TABLE IF EXISTS user_consents CASCADE;
      DROP TABLE IF EXISTS policy_version_audiences CASCADE;
      DROP TABLE IF EXISTS policy_versions CASCADE;
      DROP TABLE IF EXISTS audiences CASCADE;
      DROP TABLE IF EXISTS policies CASCADE;
      DROP TABLE IF EXISTS policy_kinds CASCADE;
      DROP TABLE IF EXISTS tenants CASCADE;
    `);
    
    // Create all required tables
    await client.query(`
      -- Create tenants table
      CREATE TABLE tenants (
        id SERIAL PRIMARY KEY,
        code VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        language VARCHAR(10) DEFAULT 'th',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      -- Create policy_kinds table
      CREATE TABLE policy_kinds (
        id SERIAL PRIMARY KEY,
        code VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      -- Create policies table
      CREATE TABLE policies (
        id SERIAL PRIMARY KEY,
        tenant_code VARCHAR(50) NOT NULL,
        policy_kind_code VARCHAR(50) NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      -- Create audiences table
      CREATE TABLE audiences (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) UNIQUE NOT NULL,
        description VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      -- Create policy_versions table
      CREATE TABLE policy_versions (
        id SERIAL PRIMARY KEY,
        policy_id INTEGER REFERENCES policies(id),
        version VARCHAR(20) NOT NULL,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        language VARCHAR(10) NOT NULL,
        effective_date DATE,
        expiry_date DATE,
        is_active BOOLEAN DEFAULT true,
        is_mandatory BOOLEAN DEFAULT false,
        enforce_mode VARCHAR(20) DEFAULT 'optional',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(policy_id, version, language)
      );
      
      -- Create policy_version_audiences junction table
      CREATE TABLE policy_version_audiences (
        id SERIAL PRIMARY KEY,
        policy_version_id INTEGER REFERENCES policy_versions(id),
        audience_id INTEGER REFERENCES audiences(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(policy_version_id, audience_id)
      );
      
      -- Create user_consents table
      CREATE TABLE user_consents (
        id SERIAL PRIMARY KEY,
        policy_version_id INTEGER REFERENCES policy_versions(id),
        user_id_passport VARCHAR(50) NOT NULL,
        user_name VARCHAR(255),
        user_email VARCHAR(255),
        user_phone VARCHAR(20),
        user_type VARCHAR(50),
        consent_given BOOLEAN DEFAULT false,
        consent_date TIMESTAMP,
        ip_address VARCHAR(50),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Insert default data
    await client.query(`
      -- Insert default tenant
      INSERT INTO tenants (code, name, language) 
      VALUES ('default', 'Default Tenant', 'th');
      
      -- Insert default policy kind
      INSERT INTO policy_kinds (code, name, description)
      VALUES ('privacy', 'Privacy Policy', 'Privacy and data protection policies');
      
      -- Insert default audiences
      INSERT INTO audiences (name, description) VALUES 
        ('customer', 'External customers'),
        ('employee', 'Internal employees'),
        ('partner', 'Business partners');
    `);
    
    console.log('✅ Database schema fixed successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error fixing database:', error.message);
    process.exit(1);
  } finally {
    client.release();
    pool.end();
  }
}

fixDatabase();
