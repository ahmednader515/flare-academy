# PowerShell script to create a fresh PostgreSQL baseline migration
# This script helps migrate from MySQL to PostgreSQL

Write-Host "🔄 Creating PostgreSQL Baseline Migration" -ForegroundColor Cyan
Write-Host ""

# Check if schema is PostgreSQL
$schemaPath = "prisma\schema.prisma"
$schemaContent = Get-Content $schemaPath -Raw

if ($schemaContent -notmatch 'provider\s*=\s*"postgresql"') {
    Write-Host "❌ Error: Schema is not set to PostgreSQL" -ForegroundColor Red
    Write-Host "Run: npm run migrate:update-schema first" -ForegroundColor Yellow
    exit 1
}

Write-Host "✓ Schema is set to PostgreSQL" -ForegroundColor Green
Write-Host ""

# Option 1: Reset and create fresh (for empty database)
Write-Host "Option 1: Reset database (DROPS ALL DATA!)" -ForegroundColor Yellow
Write-Host "This is safe if PostgreSQL is empty or you have a backup" -ForegroundColor Yellow
Write-Host ""
$reset = Read-Host "Do you want to reset the database? (y/N)"
if ($reset -eq "y" -or $reset -eq "Y") {
    Write-Host ""
    Write-Host "Resetting database..." -ForegroundColor Cyan
    npx prisma migrate reset --skip-seed
    Write-Host ""
    Write-Host "Creating baseline migration..." -ForegroundColor Cyan
    npx prisma migrate dev --name init_postgresql
    Write-Host ""
    Write-Host "✅ Baseline migration created!" -ForegroundColor Green
    exit 0
}

# Option 2: Create baseline without reset (for existing data)
Write-Host ""
Write-Host "Option 2: Create baseline migration without reset" -ForegroundColor Yellow
Write-Host "This creates a migration that matches your current schema" -ForegroundColor Yellow
Write-Host ""
$create = Read-Host "Create baseline migration? (Y/n)"
if ($create -ne "n" -and $create -ne "N") {
    Write-Host ""
    Write-Host "Creating baseline migration..." -ForegroundColor Cyan
    Write-Host "Note: You may need to mark old migrations as resolved first" -ForegroundColor Yellow
    Write-Host ""
    
    # Try to create the migration
    try {
        npx prisma migrate dev --name init_postgresql --create-only
        Write-Host ""
        Write-Host "✅ Baseline migration created!" -ForegroundColor Green
        Write-Host ""
        Write-Host "📝 Next steps:" -ForegroundColor Cyan
        Write-Host "1. Review the generated migration file in prisma/migrations/" -ForegroundColor White
        Write-Host "2. If it looks correct, run: npx prisma migrate deploy" -ForegroundColor White
        Write-Host "3. Then run: npm run migrate:mysql-to-postgres" -ForegroundColor White
    } catch {
        Write-Host ""
        Write-Host "⚠️  Migration creation failed. You may need to:" -ForegroundColor Yellow
        Write-Host "1. Mark existing migrations as resolved: npx prisma migrate resolve --applied <migration_name>" -ForegroundColor White
        Write-Host "2. Or reset the database: npx prisma migrate reset" -ForegroundColor White
    }
}

Write-Host ""
Write-Host "Done!" -ForegroundColor Green

