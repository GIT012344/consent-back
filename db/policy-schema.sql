-- Create tables for policy management system

-- Tenants table
CREATE TABLE IF NOT EXISTS tenants (
    code VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    language VARCHAR(10) DEFAULT 'th',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Policy kinds table
CREATE TABLE IF NOT EXISTS policy_kinds (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Policies table
CREATE TABLE IF NOT EXISTS policies (
    id SERIAL PRIMARY KEY,
    tenant_code VARCHAR(50) REFERENCES tenants(code),
    policy_kind_code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Policy versions table
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
);

-- Audiences table
CREATE TABLE IF NOT EXISTS audiences (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Policy version audiences junction table
CREATE TABLE IF NOT EXISTS policy_version_audiences (
    policy_version_id INTEGER REFERENCES policy_versions(id),
    audience_id INTEGER REFERENCES audiences(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (policy_version_id, audience_id)
);

-- Insert default data
INSERT INTO tenants (code, name, language) 
VALUES ('default', 'Default Tenant', 'th')
ON CONFLICT (code) DO NOTHING;

INSERT INTO policy_kinds (code, name, description) 
VALUES 
    ('privacy', 'Privacy Policy', 'Privacy and data protection policies'),
    ('consent', 'Consent Policy', 'General consent policies'),
    ('terms', 'Terms of Service', 'Terms and conditions')
ON CONFLICT (code) DO NOTHING;

INSERT INTO audiences (name, description)
VALUES 
    ('customer', 'Customer users'),
    ('employee', 'Employee users'),
    ('partner', 'Partner users'),
    ('public', 'Public users')
ON CONFLICT (name) DO NOTHING;
