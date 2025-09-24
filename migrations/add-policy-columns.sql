-- Add missing policy columns to consent_records and consent_history
-- This migration adds policy-related columns needed for policy tracking

-- 1. Add policy columns to consent_records
ALTER TABLE consent_records ADD COLUMN IF NOT EXISTS policy_id INTEGER;
ALTER TABLE consent_records ADD COLUMN IF NOT EXISTS policy_title VARCHAR(500);
ALTER TABLE consent_records ADD COLUMN IF NOT EXISTS policy_version VARCHAR(100);

-- 2. Add policy columns to consent_history
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'consent_history') THEN
    ALTER TABLE consent_history ADD COLUMN IF NOT EXISTS policy_id INTEGER;
    ALTER TABLE consent_history ADD COLUMN IF NOT EXISTS policy_title VARCHAR(500);
    ALTER TABLE consent_history ADD COLUMN IF NOT EXISTS policy_version VARCHAR(100);
  END IF;
END $$;

-- 3. Add indexes for policy_id for better query performance
CREATE INDEX IF NOT EXISTS idx_consent_records_policy_id ON consent_records(policy_id);
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'consent_history') THEN
    CREATE INDEX IF NOT EXISTS idx_consent_history_policy_id ON consent_history(policy_id);
  END IF;
END $$;

-- Display success message
DO $$ 
BEGIN 
  RAISE NOTICE 'Policy columns have been successfully added!'; 
END $$;
