# PowerShell script to fix PostgreSQL migration state
# This clears the failed migration state so you can create a fresh baseline

Write-Host "Fixing PostgreSQL Migration State" -ForegroundColor Cyan
Write-Host ""

# Check if .env exists
if (-not (Test-Path ".env")) {
    Write-Host "Error: .env file not found" -ForegroundColor Red
    exit 1
}

# Load environment variables
$envContent = Get-Content ".env" | Where-Object { $_ -match "^[^#].*=" }
$envVars = @{}
foreach ($line in $envContent) {
    if ($line -match "^([^=]+)=(.*)$") {
        $key = $matches[1].Trim()
        $value = $matches[2].Trim()
        # Remove quotes if present
        $value = $value -replace '^["'']|["'']$', ''
        $envVars[$key] = $value
    }
}

# Get PostgreSQL URL
$pgUrl = $envVars["POSTGRES_DATABASE_URL"]
if (-not $pgUrl) {
    $pgUrl = $envVars["DATABASE_URL"]
}

if (-not $pgUrl) {
    Write-Host "Error: POSTGRES_DATABASE_URL or DATABASE_URL not found in .env" -ForegroundColor Red
    exit 1
}

Write-Host "Found PostgreSQL connection string" -ForegroundColor Green
Write-Host ""

# Parse the connection string - handle both postgres:// and postgresql://
# Normalize to postgresql:// for URI parsing
$normalizedUrl = $pgUrl -replace '^postgres://', 'postgresql://'

# Try to parse as URI first
try {
    $uri = [System.Uri]$normalizedUrl
    $pgUser = $uri.UserInfo.Split(':')[0]
    $pgPass = if ($uri.UserInfo.Contains(':')) { 
        $parts = $uri.UserInfo.Split(':', 2)
        if ($parts.Length -gt 1) { $parts[1] } else { '' }
    } else { '' }
    $pgHost = $uri.Host
    $pgPort = if ($uri.Port -ne -1) { $uri.Port } else { 5432 }
    $pathParts = $uri.AbsolutePath.TrimStart('/').Split('?')[0].Split('&')[0]
    $pgDb = if ($pathParts) { $pathParts } else { 'postgres' }
    
    # URL decode password if needed (handle common encoding)
    try {
        $pgPass = [System.Uri]::UnescapeDataString($pgPass)
    } catch {
        # If decoding fails, use original password
    }
    
    # Validate we got the essential parts
    if (-not $pgUser -or -not $pgHost) {
        throw "URI parsing incomplete"
    }
} catch {
    # Fallback to regex parsing
    $regexPattern = '(?:postgres|postgresql)://([^:]+):([^@]+)@([^:]+):(\d+)/(.+)'
    if ($pgUrl -match $regexPattern) {
        $pgUser = $matches[1]
        $pgPass = $matches[2]
        $pgHost = $matches[3]
        $pgPort = $matches[4]
        $pgDb = $matches[5]
    } else {
        Write-Host "Error: Could not parse PostgreSQL connection string" -ForegroundColor Red
        Write-Host "Connection string format: postgres://user:password@host:port/database" -ForegroundColor Yellow
        Write-Host "Your connection string starts with: $($pgUrl.Substring(0, [Math]::Min(50, $pgUrl.Length)))..." -ForegroundColor Yellow
        exit 1
    }
}

if ($pgUser -and $pgHost -and $pgDb) {
    
    Write-Host "Database: $pgDb" -ForegroundColor White
    Write-Host "Host: ${pgHost}:${pgPort}" -ForegroundColor White
    Write-Host ""
    
    Write-Host "WARNING: This will delete the _prisma_migrations table" -ForegroundColor Yellow
    Write-Host "This is safe if you want to create a fresh baseline migration" -ForegroundColor Yellow
    Write-Host ""
    
    $confirm = Read-Host "Continue? (y/N)"
    if ($confirm -ne "y" -and $confirm -ne "Y") {
        Write-Host "Cancelled" -ForegroundColor Yellow
        exit 0
    }
    
    Write-Host ""
    Write-Host "Connecting to PostgreSQL..." -ForegroundColor Cyan
    
    # Use psql if available, otherwise provide instructions
    $psqlPath = Get-Command psql -ErrorAction SilentlyContinue
    
    if ($psqlPath) {
        $env:PGPASSWORD = $pgPass
        $sqlCommand = "DROP TABLE IF EXISTS _prisma_migrations CASCADE;"
        
        try {
            $result = & psql -h $pgHost -p $pgPort -U $pgUser -d $pgDb -c $sqlCommand 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Host "Successfully deleted _prisma_migrations table" -ForegroundColor Green
                Write-Host ""
                Write-Host "Next steps:" -ForegroundColor Cyan
                Write-Host "1. Create baseline migration:" -ForegroundColor White
                Write-Host "   npx prisma migrate dev --name init_postgresql --create-only" -ForegroundColor Yellow
                Write-Host ""
                Write-Host "2. Review the migration file, then apply:" -ForegroundColor White
                Write-Host "   npx prisma migrate deploy" -ForegroundColor Yellow
                Write-Host ""
                Write-Host "3. Migrate your data:" -ForegroundColor White
                Write-Host "   npm run migrate:mysql-to-postgres" -ForegroundColor Yellow
            } else {
                Write-Host "Error running SQL:" -ForegroundColor Red
                Write-Host $result
            }
        } catch {
            Write-Host "Error: $_" -ForegroundColor Red
            Write-Host ""
            Write-Host "Please run this SQL manually in your PostgreSQL database:" -ForegroundColor Yellow
            Write-Host "DROP TABLE IF EXISTS _prisma_migrations CASCADE;" -ForegroundColor White
        } finally {
            Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
        }
    } else {
        Write-Host "psql not found in PATH" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Please run this SQL manually in your PostgreSQL database:" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "DROP TABLE IF EXISTS _prisma_migrations CASCADE;" -ForegroundColor White
        Write-Host ""
        Write-Host "Or use pgAdmin, DBeaver, or any PostgreSQL client" -ForegroundColor White
        Write-Host ""
        Write-Host "Connection details:" -ForegroundColor Cyan
        Write-Host "  Host: $pgHost" -ForegroundColor White
        Write-Host "  Port: $pgPort" -ForegroundColor White
        Write-Host "  Database: $pgDb" -ForegroundColor White
        Write-Host "  User: $pgUser" -ForegroundColor White
    }
} else {
    Write-Host "Error: Could not parse connection string components" -ForegroundColor Red
    exit 1
}
