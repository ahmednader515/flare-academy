# Script to add logoutScheduledAt field to User table
# Run this script to apply the migration

Write-Host "🔄 Adding logoutScheduledAt field to User table..." -ForegroundColor Cyan

# Check if we're in the right directory
if (-not (Test-Path "prisma\schema.prisma")) {
    Write-Host "❌ Error: prisma\schema.prisma not found. Please run this script from the project root." -ForegroundColor Red
    exit 1
}

# Generate Prisma client (this will pick up the schema changes)
Write-Host "📦 Generating Prisma client..." -ForegroundColor Yellow
npx prisma generate

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error generating Prisma client" -ForegroundColor Red
    exit 1
}

# Create migration
Write-Host "📝 Creating migration..." -ForegroundColor Yellow
npx prisma migrate dev --name add_logout_scheduled_at

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error creating migration" -ForegroundColor Red
    Write-Host "💡 You may need to manually run the SQL in prisma/migrations/manual_add_logout_scheduled_at.sql" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Migration completed successfully!" -ForegroundColor Green

