# Quick Migration Reference

## Quick Start

1. **Set up PostgreSQL database** and add to `.env`:
   ```env
   POSTGRES_DATABASE_URL="postgresql://user:password@host:5432/database_name"
   ```

2. **Update Prisma schema**:
   ```bash
   npm run migrate:update-schema
   ```

3. **Create PostgreSQL schema**:
   ```bash
   npx prisma generate
   npx prisma migrate deploy
   ```

4. **Migrate data**:
   ```bash
   npm run migrate:mysql-to-postgres
   ```

5. **Verify and switch**:
   - Verify data in PostgreSQL
   - Update `DATABASE_URL` to PostgreSQL
   - Restart application

## Commands Summary

- `npm run migrate:update-schema` - Updates Prisma schema to PostgreSQL
- `npm run migrate:mysql-to-postgres` - Migrates data from MySQL to PostgreSQL

For detailed instructions, see `MIGRATION_GUIDE.md`.

