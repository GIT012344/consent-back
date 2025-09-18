-- Fix Database Field Sizes
-- This migration increases field sizes to prevent truncation errors

-- 1. Fix consent_records table
ALTER TABLE consent_records 
  ALTER COLUMN title TYPE VARCHAR(100),
  ALTER COLUMN name_surname TYPE VARCHAR(500),
  ALTER COLUMN id_passport TYPE VARCHAR(100),
  ALTER COLUMN email TYPE VARCHAR(255),
  ALTER COLUMN phone TYPE VARCHAR(50),
  ALTER COLUMN consent_type TYPE VARCHAR(100),
  ALTER COLUMN user_type TYPE VARCHAR(100),
  ALTER COLUMN consent_version TYPE VARCHAR(100),
  ALTER COLUMN ip_address TYPE VARCHAR(100),
  ALTER COLUMN status TYPE VARCHAR(50);

-- 2. Fix consent_history table if exists
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'consent_history') THEN
    ALTER TABLE consent_history 
      ALTER COLUMN name_surname TYPE VARCHAR(500),
      ALTER COLUMN id_passport TYPE VARCHAR(100),
      ALTER COLUMN consent_version TYPE VARCHAR(100),
      ALTER COLUMN consent_type TYPE VARCHAR(100),
      ALTER COLUMN user_type TYPE VARCHAR(100);
  END IF;
END $$;

-- 3. Fix simple_policy table if exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'simple_policy') THEN
    ALTER TABLE simple_policy
      ALTER COLUMN title TYPE VARCHAR(500),
      ALTER COLUMN user_type TYPE VARCHAR(100);
  END IF;
END $$;

-- 4. Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_consent_records_id_passport ON consent_records(id_passport);
CREATE INDEX IF NOT EXISTS idx_consent_records_user_type ON consent_records(user_type);
CREATE INDEX IF NOT EXISTS idx_consent_records_created_date ON consent_records(created_date);

-- Display success message
DO $$ 
BEGIN 
  RAISE NOTICE 'Field sizes have been successfully updated!'; 
END $$;
