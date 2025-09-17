const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '4321',
  database: process.env.DB_NAME || 'consent'
});

async function resetDatabase() {
  let client;
  try {
    client = await pool.connect();
    console.log('🔧 Resetting database...');
    
    // Drop existing tables
    await client.query(`
      DROP TABLE IF EXISTS user_consents CASCADE;
      DROP TABLE IF EXISTS policy_version_audiences CASCADE;
      DROP TABLE IF EXISTS policy_versions CASCADE;
      DROP TABLE IF EXISTS audiences CASCADE;
      DROP TABLE IF EXISTS policies CASCADE;
      DROP TABLE IF EXISTS policy_kinds CASCADE;
      DROP TABLE IF EXISTS tenants CASCADE;
    `);
    
    // Create tables
    await client.query(`
      CREATE TABLE tenants (
        id SERIAL PRIMARY KEY,
        code VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        language VARCHAR(10) DEFAULT 'th',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE policy_kinds (
        id SERIAL PRIMARY KEY,
        code VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE policies (
        id SERIAL PRIMARY KEY,
        tenant_code VARCHAR(50) NOT NULL,
        policy_kind_code VARCHAR(50) NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE audiences (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) UNIQUE NOT NULL,
        description VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
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
      
      CREATE TABLE policy_version_audiences (
        id SERIAL PRIMARY KEY,
        policy_version_id INTEGER REFERENCES policy_versions(id),
        audience_id INTEGER REFERENCES audiences(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(policy_version_id, audience_id)
      );
      
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
      INSERT INTO tenants (code, name, language) 
      VALUES ('default', 'Default Tenant', 'th');
      
      INSERT INTO policy_kinds (code, name, description)
      VALUES ('privacy', 'Privacy Policy', 'Privacy and data protection policies');
      
      INSERT INTO audiences (name, description) VALUES 
        ('customer', 'External customers'),
        ('employee', 'Internal employees'),
        ('partner', 'Business partners');
    `);
    
    console.log('✅ Database reset successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    if (client) client.release();
    await pool.end();
    process.exit(0);
  }
}

resetDatabase();
