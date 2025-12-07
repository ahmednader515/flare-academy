# PowerShell script to create a baseline migration for existing database

Write-Host "Creating baseline migration for existing PostgreSQL database" -ForegroundColor Cyan
Write-Host ""

# Create the migration directory with timestamp
$timestamp = Get-Date -Format "yyyyMMddHHmmss"
$migrationName = "init_postgresql"
$migrationDir = "prisma\migrations\${timestamp}_${migrationName}"

New-Item -ItemType Directory -Path $migrationDir -Force | Out-Null

# Create an empty migration file (or minimal one)
$migrationFile = Join-Path $migrationDir "migration.sql"
$migrationContent = @"
-- CreatePostgresqlBaseline
-- This migration represents the baseline state of the database
-- The schema was created using prisma db push
"@

Set-Content -Path $migrationFile -Value $migrationContent

Write-Host "Created migration directory: $migrationDir" -ForegroundColor Green
Write-Host ""

# Now mark it as applied
Write-Host "Marking migration as applied..." -ForegroundColor Cyan

# Use prisma migrate resolve to mark it as applied
$migrationId = "${timestamp}_${migrationName}"
$resolveResult = npx prisma migrate resolve --applied $migrationId 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "Baseline migration created and marked as applied!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Migrate your data: npm run migrate:mysql-to-postgres" -ForegroundColor Yellow
    Write-Host "2. Test your application" -ForegroundColor Yellow
} else {
    Write-Host "Warning: Could not mark migration as applied automatically" -ForegroundColor Yellow
    Write-Host "You may need to run manually:" -ForegroundColor Yellow
    Write-Host "  npx prisma migrate resolve --applied $migrationId" -ForegroundColor White
    Write-Host ""
    Write-Host "Or use: npx prisma migrate deploy" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Done!" -ForegroundColor Green

