@echo off
echo Fixing database schema...
set PGPASSWORD=4321
psql -U postgres -d consent -c "ALTER TABLE consent_records ADD COLUMN IF NOT EXISTS browser VARCHAR(500);"
psql -U postgres -d consent -c "ALTER TABLE consent_records ADD COLUMN IF NOT EXISTS consent_id VARCHAR(100);"
psql -U postgres -d consent -c "ALTER TABLE consent_records ADD COLUMN IF NOT EXISTS email VARCHAR(255);"
psql -U postgres -d consent -c "ALTER TABLE consent_records ADD COLUMN IF NOT EXISTS phone VARCHAR(20);"
psql -U postgres -d consent -c "ALTER TABLE consent_records ADD COLUMN IF NOT EXISTS user_agent TEXT;"
psql -U postgres -d consent -c "ALTER TABLE consent_records ADD COLUMN IF NOT EXISTS consent_version_id INTEGER;"
psql -U postgres -d consent -c "ALTER TABLE consent_records ADD COLUMN IF NOT EXISTS policy_title VARCHAR(255);"
psql -U postgres -d consent -c "ALTER TABLE consent_history ADD COLUMN IF NOT EXISTS policy_title VARCHAR(255);"
echo Database fixed!
pause
