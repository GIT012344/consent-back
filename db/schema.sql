-- Database Schema for Consent Management System
-- PostgreSQL version

-- Drop tables if exist (for development)
DROP TABLE IF EXISTS consent_history CASCADE;
DROP TABLE IF EXISTS consent_records CASCADE;
DROP TABLE IF EXISTS consent_versions CASCADE;
DROP TABLE IF EXISTS form_templates CASCADE;

-- Create consent_versions table
CREATE TABLE consent_versions (
  id SERIAL PRIMARY KEY,
  version VARCHAR(50) NOT NULL,
  version_name VARCHAR(50),
  description TEXT,
  file_name VARCHAR(255),
  file_path TEXT,
  file_url TEXT,
  file_size INTEGER,
  mime_type VARCHAR(100),
  language VARCHAR(10) DEFAULT 'th',
  user_type VARCHAR(50) DEFAULT 'customer',
  is_active BOOLEAN DEFAULT FALSE,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(100) DEFAULT 'system'
);

-- Create consent_records table
CREATE TABLE consent_records (
  id SERIAL PRIMARY KEY,
  uid VARCHAR(50) UNIQUE DEFAULT gen_random_uuid(),
  title VARCHAR(20),
  name_surname VARCHAR(255) NOT NULL,
  id_passport VARCHAR(50) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  consent_type VARCHAR(50) DEFAULT 'general',
  user_type VARCHAR(50) DEFAULT 'customer',
  consent_language VARCHAR(10) DEFAULT 'th',
  consent_version VARCHAR(50),
  consent_version_id INTEGER REFERENCES consent_versions(id),
  consent_date DATE DEFAULT CURRENT_DATE,
  consent_time TIME DEFAULT CURRENT_TIME,
  created_date DATE DEFAULT CURRENT_DATE,
  created_time TIME DEFAULT CURRENT_TIME,
  ip_address VARCHAR(50),
  browser_info TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create consent_history table  
CREATE TABLE consent_history (
  id SERIAL PRIMARY KEY,
  consent_id INTEGER,
  uid VARCHAR(50),
  title VARCHAR(20),
  name_surname VARCHAR(255) NOT NULL,
  id_passport VARCHAR(50) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  consent_type VARCHAR(50),
  user_type VARCHAR(50) DEFAULT 'customer',
  consent_language VARCHAR(10),
  consent_version VARCHAR(50),
  consent_version_id INTEGER REFERENCES consent_versions(id),
  consent_date DATE,
  consent_time TIME,
  action VARCHAR(50) DEFAULT 'created',
  ip_address VARCHAR(50),
  browser_info TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create form_templates table
CREATE TABLE form_templates (
  id SERIAL PRIMARY KEY,
  user_type VARCHAR(50) NOT NULL,
  fields JSONB NOT NULL,
  consent_text TEXT,
  language VARCHAR(10) DEFAULT 'th',
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(100) DEFAULT 'admin'
);

-- Create indexes
CREATE INDEX idx_consent_records_id_passport ON consent_records(id_passport);
CREATE INDEX idx_consent_records_active ON consent_records(is_active);
CREATE INDEX idx_consent_records_user_type ON consent_records(user_type);
CREATE INDEX idx_consent_versions_active ON consent_versions(is_active);
CREATE INDEX idx_consent_versions_user_type ON consent_versions(user_type);
CREATE INDEX idx_consent_history_id_passport ON consent_history(id_passport);
CREATE INDEX idx_form_templates_user_type ON form_templates(user_type);

-- Insert default consent version
INSERT INTO consent_versions (version, version_name, description, language, user_type, is_active)
VALUES 
  ('1.0', 'v1.0', 'Default consent version', 'th', 'customer', true),
  ('1.0', 'v1.0', 'Default consent version', 'en', 'customer', true),
  ('1.0', 'v1.0', 'Employee consent version', 'th', 'employee', true),
  ('1.0', 'v1.0', 'Partner consent version', 'th', 'partner', true);

-- Insert default form templates
INSERT INTO form_templates (user_type, fields, consent_text, language, is_active)
VALUES 
  ('customer', '[]', 'ข้อตกลงและเงื่อนไขการใช้บริการ', 'th', true),
  ('employee', '[]', 'ข้อตกลงพนักงาน', 'th', true),
  ('partner', '[]', 'ข้อตกลงพาร์ทเนอร์', 'th', true);
