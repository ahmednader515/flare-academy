# PowerShell script to run the coursePrice migration
Write-Host "Running coursePrice migration..." -ForegroundColor Cyan

# Run the SQL migration
$migrationFile = "prisma\migrations\manual_add_course_price_to_purchase.sql"
$dbUrl = $env:DATABASE_URL

if (-not $dbUrl) {
    Write-Host "Error: DATABASE_URL environment variable is not set" -ForegroundColor Red
    exit 1
}

Write-Host "Reading migration file: $migrationFile" -ForegroundColor Yellow
$sql = Get-Content $migrationFile -Raw

# Note: This script assumes you have psql installed or use a database client
# For PostgreSQL, you would typically use:
# psql $dbUrl -f $migrationFile

Write-Host "Migration SQL:" -ForegroundColor Green
Write-Host $sql -ForegroundColor Gray

Write-Host "`nPlease run this SQL manually in your database client or use psql:" -ForegroundColor Yellow
Write-Host "psql `$DATABASE_URL -f $migrationFile" -ForegroundColor Cyan

Write-Host "`nAfter running the migration, regenerate Prisma client:" -ForegroundColor Yellow
Write-Host "npx prisma generate" -ForegroundColor Cyan

