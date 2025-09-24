@echo off
echo Checking database directly...
psql -U postgres -d consent -p 5432 -h localhost -c "SELECT id, user_type, language, title, LEFT(content, 100) as content_preview, is_active FROM policy_versions WHERE is_active = true ORDER BY created_at DESC;"
pause
