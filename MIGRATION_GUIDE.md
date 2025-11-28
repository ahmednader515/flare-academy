# MySQL to PostgreSQL Migration Guide

This guide will help you migrate your database from MySQL to PostgreSQL without losing any data.

## Prerequisites

1. **PostgreSQL Database**: Ensure you have a PostgreSQL database set up and accessible
2. **Environment Variables**: You'll need both MySQL and PostgreSQL connection strings
3. **Backup**: **IMPORTANT** - Always backup your MySQL database before migration

## Step 1: Install Dependencies

The required packages are already installed:
- `mysql2` - MySQL client for Node.js
- `pg` - PostgreSQL client for Node.js
- `dotenv` - Environment variable management

## Step 2: Set Up Environment Variables

Create or update your `.env` file with both database connections:

```env
# MySQL Database (existing - source)
MYSQL_DATABASE_URL="mysql://user:password@host:3306/database_name"

# PostgreSQL Database (new - destination)
POSTGRES_DATABASE_URL="postgresql://user:password@host:5432/database_name"

# Current DATABASE_URL (should point to PostgreSQL after migration)
DATABASE_URL="postgresql://user:password@host:5432/database_name"
```

**Important Notes**:
- `MYSQL_DATABASE_URL` - Your existing MySQL database (source)
- `POSTGRES_DATABASE_URL` - Your new PostgreSQL database (destination)
- `DATABASE_URL` - Used by Prisma, should point to PostgreSQL after schema update
- If `MYSQL_DATABASE_URL` is not set, the script will check if `DATABASE_URL` is MySQL format as fallback

## Step 3: Update Prisma Schema

Before migrating data, you need to update your Prisma schema to use PostgreSQL:

1. **Update the datasource provider** in `prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "postgresql"  // Change from "mysql"
     url      = env("DATABASE_URL")
   }
   ```

2. **Update migration lock** (optional, will be updated automatically):
   The `prisma/migrations/migration_lock.toml` will be updated when you run migrations.

## Step 4: Create PostgreSQL Schema

1. **Create the database** in PostgreSQL (if not already created):
   ```sql
   CREATE DATABASE your_database_name;
   ```

2. **Generate Prisma Client**:
   ```bash
   npx prisma generate
   ```

3. **Create the schema in PostgreSQL** (this will create empty tables):
   ```bash
   npx prisma migrate deploy
   ```
   
   Or if you want to create a new migration:
   ```bash
   npx prisma migrate dev --name init_postgresql
   ```

   **Important**: This creates the table structure. The tables will be empty.

## Step 5: Run the Migration Script

Now you can migrate the data from MySQL to PostgreSQL:

```bash
npm run migrate:mysql-to-postgres
```

The script will:
1. Connect to both MySQL and PostgreSQL databases
2. Export data from each table in MySQL (in the correct order to respect foreign keys)
3. Import data into PostgreSQL
4. Provide a summary of the migration

## Step 6: Verify the Migration

After migration, verify the data:

1. **Check row counts**:
   ```bash
   # In PostgreSQL
   SELECT 
     schemaname,
     tablename,
     n_live_tup as row_count
   FROM pg_stat_user_tables
   ORDER BY tablename;
   ```

2. **Compare with MySQL**:
   ```sql
   -- In MySQL
   SELECT 
     table_name,
     table_rows
   FROM information_schema.tables
   WHERE table_schema = 'your_database_name'
   ORDER BY table_name;
   ```

3. **Test your application** with the new PostgreSQL database

## Step 7: Update Application Configuration

Once verified, update your application to use PostgreSQL:

1. Update `DATABASE_URL` in `.env` to point to PostgreSQL
2. Restart your application
3. Test thoroughly

## Troubleshooting

### Connection Issues

- **MySQL Connection Failed**: Check your MySQL `DATABASE_URL` format
- **PostgreSQL Connection Failed**: Ensure PostgreSQL is running and `POSTGRES_DATABASE_URL` is correct

### Table Not Found Errors

The script automatically discovers table names. If a table is not found:
- Check that the table exists in MySQL
- Verify the table name matches the Prisma model name
- Check MySQL user permissions

### Data Type Issues

Some MySQL-specific types may need conversion:
- `TINYINT(1)` → `BOOLEAN` (handled automatically)
- `DATETIME` → `TIMESTAMP` (handled automatically)
- `TEXT` fields are preserved as-is

### Foreign Key Violations

The script imports tables in the correct order to respect foreign keys. If you encounter FK violations:
- Ensure the PostgreSQL schema was created correctly
- Check that parent tables (User, Course) are imported before child tables

### Duplicate Key Errors

The script uses `ON CONFLICT DO NOTHING` to handle duplicates. If you see duplicate errors:
- The data might already exist in PostgreSQL
- Clear the PostgreSQL tables and re-run migration if needed

## Migration Order

The script migrates tables in this order (respecting foreign key dependencies):

1. User
2. Course
3. Attachment
4. Chapter
5. ChapterAttachment
6. UserProgress
7. Purchase
8. BalanceTransaction
9. Quiz
10. Question
11. QuizResult
12. QuizAnswer
13. SavedDocument

## Performance Tips

- The script uses batch inserts (100 rows at a time) for better performance
- For large databases, the migration may take some time
- Consider running during low-traffic periods

## Rollback Plan

If something goes wrong:

1. **Keep your MySQL database** - Don't delete it until you're confident
2. **Restore from backup** if needed
3. **Switch back** to MySQL by updating `DATABASE_URL` and Prisma schema

## Support

If you encounter issues:
1. Check the migration summary output
2. Review error messages in the console
3. Verify database connections and permissions
4. Ensure PostgreSQL schema matches MySQL structure

