-- Add missing columns for policy tracking
-- These columns are needed for the consent submission to work properly

-- Add policy_id column to consent_records
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'consent_records' 
                   AND column_name = 'policy_id') THEN
        ALTER TABLE consent_records ADD COLUMN policy_id INTEGER;
    END IF;
END $$;

-- Add policy_title column to consent_records
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'consent_records' 
                   AND column_name = 'policy_title') THEN
        ALTER TABLE consent_records ADD COLUMN policy_title TEXT;
    END IF;
END $$;

-- Add policy_version column to consent_records (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'consent_records' 
                   AND column_name = 'policy_version') THEN
        ALTER TABLE consent_records ADD COLUMN policy_version VARCHAR(50);
    END IF;
END $$;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_consent_records_policy_id ON consent_records(policy_id);
CREATE INDEX IF NOT EXISTS idx_consent_records_policy_title ON consent_records(policy_title);

-- Also add these columns to consent_history for consistency
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'consent_history' 
                   AND column_name = 'policy_id') THEN
        ALTER TABLE consent_history ADD COLUMN policy_id INTEGER;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'consent_history' 
                   AND column_name = 'policy_title') THEN
        ALTER TABLE consent_history ADD COLUMN policy_title TEXT;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'consent_history' 
                   AND column_name = 'policy_version') THEN
        ALTER TABLE consent_history ADD COLUMN policy_version VARCHAR(50);
    END IF;
END $$;
