-- ลบ tables ที่ไม่ใช้
DROP TABLE IF EXISTS consent_form_templates CASCADE;
DROP TABLE IF EXISTS consent_form_fields CASCADE;
DROP TABLE IF EXISTS consent_templates CASCADE;
DROP TABLE IF EXISTS template_fields CASCADE;
DROP TABLE IF EXISTS form_templates CASCADE;
DROP TABLE IF EXISTS form_fields CASCADE;
DROP TABLE IF EXISTS user_consents CASCADE;
DROP TABLE IF EXISTS consent_logs CASCADE;

-- ลบ columns ที่ไม่ใช้
ALTER TABLE policy_versions 
DROP COLUMN IF EXISTS template_id,
DROP COLUMN IF EXISTS form_data,
DROP COLUMN IF EXISTS custom_fields;

ALTER TABLE consent_records
DROP COLUMN IF EXISTS form_responses,
DROP COLUMN IF EXISTS template_version;

ALTER TABLE policies
DROP COLUMN IF EXISTS template_type,
DROP COLUMN IF EXISTS custom_config;

-- ลบข้อมูลทดสอบ
DELETE FROM consent_records WHERE user_id LIKE 'test%';
DELETE FROM policy_versions WHERE title LIKE 'Test%' OR title LIKE 'test%';

-- ลบข้อมูลที่ไม่มี reference
DELETE FROM policy_version_audiences 
WHERE policy_version_id NOT IN (SELECT id FROM policy_versions);

DELETE FROM consent_history 
WHERE consent_record_id NOT IN (SELECT id FROM consent_records);

VACUUM ANALYZE;
