# Fix: Prisma Validating Old MySQL Migrations

## The Problem

When you run `npx prisma migrate dev --name init_postgresql --create-only`, Prisma tries to validate ALL existing migrations (including old MySQL ones) against a shadow database. Since MySQL migrations use backticks and MySQL-specific syntax, they fail on PostgreSQL.

## Solution Options

### Option 1: Automated Setup Script (Recommended)

Run the automated script that:
1. Backs up old MySQL migrations
2. Clears them temporarily  
3. Pushes schema directly to PostgreSQL
4. Creates a fresh baseline migration

```powershell
npm run migrate:setup-postgres
```

### Option 2: Manual Steps

If you prefer to do it manually:

1. **Backup old migrations:**
   ```powershell
   # Create backup
   New-Item -ItemType Directory -Path "prisma\migrations_mysql_backup"
   Copy-Item "prisma\migrations\*" -Destination "prisma\migrations_mysql_backup" -Recurse -Exclude "migration_lock.toml"
   ```

2. **Clear old migrations (keep only migration_lock.toml):**
   ```powershell
   # Remove all migration folders except migration_lock.toml
   Get-ChildItem "prisma\migrations" -Directory | Remove-Item -Recurse -Force
   ```

3. **Push schema directly (bypasses migrations):**
   ```powershell
   npx prisma db push --accept-data-loss
   ```

4. **Create baseline migration:**
   ```powershell
   npx prisma migrate dev --name init_postgresql --create-only
   ```

5. **Apply the migration:**
   ```powershell
   npx prisma migrate deploy
   ```

6. **Migrate your data:**
   ```powershell
   npm run migrate:mysql-to-postgres
   ```

### Option 3: Use Environment Variable (Skip Shadow DB)

You can also try skipping shadow database validation:

```powershell
$env:PRISMA_MIGRATE_SKIP_GENERATE = "true"
npx prisma migrate dev --name init_postgresql --create-only
```

But this may not work in all cases.

## Why This Works

- `prisma db push` creates the schema directly without going through migrations
- This bypasses the shadow database validation
- Then we create a baseline migration that matches the current state
- Old MySQL migrations are backed up but not used

## After Migration

Once your data is migrated and everything works:
- You can delete the `prisma\migrations_mysql_backup` folder
- Keep the new PostgreSQL migrations in `prisma\migrations`

