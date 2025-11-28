# Fix PostgreSQL Migration Error

The error occurs because Prisma is trying to apply MySQL migrations (with backticks) to PostgreSQL.

## Quick Fix

### Option 1: Reset Migration State (Recommended)

1. **Connect to your PostgreSQL database** and run this SQL:

```sql
DROP TABLE IF EXISTS _prisma_migrations CASCADE;
```

You can do this via:
- psql command line
- pgAdmin
- Any PostgreSQL client
- Or use the SQL file: `scripts/fix-migrations.sql`

2. **Create a fresh baseline migration**:

```bash
npx prisma migrate dev --name init_postgresql --create-only
```

3. **Review the generated migration file** in `prisma/migrations/` to ensure it's correct

4. **Apply the migration**:

```bash
npx prisma migrate deploy
```

5. **Migrate your data**:

```bash
npm run migrate:mysql-to-postgres
```

### Option 2: Mark All Migrations as Resolved

If you prefer to keep the migration history:

```bash
# Mark each migration as resolved (repeat for each migration)
npx prisma migrate resolve --applied 20250413213021_add_chapters
npx prisma migrate resolve --applied 20250416201829_add_purchase_model
# ... continue for all migrations
```

Then create a new baseline:

```bash
npx prisma migrate dev --name init_postgresql
```

### Option 3: Use Prisma Migrate Reset (Only if database is empty!)

**WARNING: This will DROP ALL DATA in PostgreSQL!**

```bash
npx prisma migrate reset --skip-seed
```

Then create baseline:

```bash
npx prisma migrate dev --name init_postgresql
```

## Why This Happens

- Your existing migrations were created for MySQL
- They use MySQL syntax (backticks, MySQL data types)
- PostgreSQL uses different syntax (double quotes, different types)
- Prisma tries to apply them and fails

## Solution

Create a fresh migration from your current schema that uses PostgreSQL syntax. This is safe because:
- Your PostgreSQL database is new/empty
- You'll migrate the actual data separately using the migration script
- The schema structure is the same, just different SQL syntax

