-- CLEANUP DATABASE SCRIPT
-- ลบ tables ที่ไม่ใช้และ columns ที่ซ้ำซ้อน

-- 1. ลบ tables ที่ไม่จำเป็น
DROP TABLE IF EXISTS admin_users CASCADE;
DROP TABLE IF EXISTS audiences CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS consent_form_fields CASCADE;
DROP TABLE IF EXISTS consent_titles CASCADE;
DROP TABLE IF EXISTS consent_versions CASCADE;
DROP TABLE IF EXISTS consent_version_targeting CASCADE;
DROP TABLE IF EXISTS form_templates CASCADE;
DROP TABLE IF EXISTS policies CASCADE;
DROP TABLE IF EXISTS policy_kinds CASCADE;
DROP TABLE IF EXISTS tenants CASCADE;
DROP TABLE IF EXISTS user_consents CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 2. ลบ columns ที่ซ้ำซ้อนใน consent_records
ALTER TABLE consent_records DROP COLUMN IF EXISTS title;
ALTER TABLE consent_records DROP COLUMN IF EXISTS browser;
ALTER TABLE consent_records DROP COLUMN IF EXISTS email;
ALTER TABLE consent_records DROP COLUMN IF EXISTS phone;
ALTER TABLE consent_records DROP COLUMN IF EXISTS consent_version_id;
ALTER TABLE consent_records DROP COLUMN IF EXISTS updated_at;

-- 3. แสดงโครงสร้างที่เหลือ
\dt
\d consent_records

-- 4. นับจำนวน records
SELECT COUNT(*) as total_records FROM consent_records;

-- 5. ดูตัวอย่างข้อมูล
SELECT id, name_surname, id_passport, user_type, consent_version, created_date 
FROM consent_records 
LIMIT 5;
