-- Fix Database Field Sizes
-- This migration increases field sizes to prevent truncation errors

-- 1. Add missing columns to consent_records if they don't exist
ALTER TABLE consent_records ADD COLUMN IF NOT EXISTS consent_language VARCHAR(10);
ALTER TABLE consent_records ADD COLUMN IF NOT EXISTS created_time TIME DEFAULT CURRENT_TIME;

-- 2. Fix consent_records table field sizes
-- Check and alter each column individually to avoid errors
ALTER TABLE consent_records ALTER COLUMN name_surname TYPE VARCHAR(500);
ALTER TABLE consent_records ALTER COLUMN id_passport TYPE VARCHAR(100);

-- Handle email and phone columns that might be NULL
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name='consent_records' AND column_name='email') THEN
    ALTER TABLE consent_records ALTER COLUMN email TYPE VARCHAR(255);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name='consent_records' AND column_name='phone') THEN
    ALTER TABLE consent_records ALTER COLUMN phone TYPE VARCHAR(50);
  END IF;
END $$;

ALTER TABLE consent_records ALTER COLUMN consent_type TYPE VARCHAR(100);
ALTER TABLE consent_records ALTER COLUMN user_type TYPE VARCHAR(100);
ALTER TABLE consent_records ALTER COLUMN consent_version TYPE VARCHAR(100);
ALTER TABLE consent_records ALTER COLUMN ip_address TYPE VARCHAR(100);

-- Check if title and status columns exist before altering
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name='consent_records' AND column_name='title') THEN
    ALTER TABLE consent_records ALTER COLUMN title TYPE VARCHAR(100);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name='consent_records' AND column_name='status') THEN
    ALTER TABLE consent_records ALTER COLUMN status TYPE VARCHAR(50);
  END IF;
END $$;

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
