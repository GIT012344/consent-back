-- Add missing columns to consent_records table
ALTER TABLE consent_records ADD COLUMN IF NOT EXISTS browser VARCHAR(500);
ALTER TABLE consent_records ADD COLUMN IF NOT EXISTS consent_id VARCHAR(100);
ALTER TABLE consent_records ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE consent_records ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE consent_records ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE consent_records ADD COLUMN IF NOT EXISTS consent_version_id INTEGER;
ALTER TABLE consent_records ADD COLUMN IF NOT EXISTS policy_title VARCHAR(255);

-- Add missing columns to consent_history table
ALTER TABLE consent_history ADD COLUMN IF NOT EXISTS policy_title VARCHAR(255);
