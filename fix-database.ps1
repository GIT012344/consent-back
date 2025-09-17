# PowerShell script to fix database schema
$env:PGPASSWORD = "4321"

Write-Host "Fixing database schema..." -ForegroundColor Yellow

$queries = @(
    "ALTER TABLE consent_records ADD COLUMN IF NOT EXISTS browser VARCHAR(500)",
    "ALTER TABLE consent_records ADD COLUMN IF NOT EXISTS consent_id VARCHAR(100)",
    "ALTER TABLE consent_records ADD COLUMN IF NOT EXISTS email VARCHAR(255)",
    "ALTER TABLE consent_records ADD COLUMN IF NOT EXISTS phone VARCHAR(20)",
    "ALTER TABLE consent_records ADD COLUMN IF NOT EXISTS user_agent TEXT",
    "ALTER TABLE consent_records ADD COLUMN IF NOT EXISTS consent_version_id INTEGER",
    "ALTER TABLE consent_records ADD COLUMN IF NOT EXISTS policy_title VARCHAR(255)",
    "ALTER TABLE consent_history ADD COLUMN IF NOT EXISTS policy_title VARCHAR(255)"
)

foreach ($query in $queries) {
    Write-Host "Executing: $($query.Substring(0, [Math]::Min(60, $query.Length)))..." -ForegroundColor Cyan
    psql -U postgres -d consent -c $query 2>$null
}

Write-Host "`nDatabase schema fixed!" -ForegroundColor Green
