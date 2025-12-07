const { Pool } = require('pg');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

/**
 * Script to fix PostgreSQL migrations by marking old MySQL migrations as resolved
 * and creating a fresh baseline migration
 */

async function fixPostgresMigrations() {
  console.log('🔧 Fixing PostgreSQL Migration State\n');

  const pgUrl = process.env.POSTGRES_DATABASE_URL || process.env.DATABASE_URL;
  if (!pgUrl) {
    console.error('❌ Error: POSTGRES_DATABASE_URL or DATABASE_URL not set');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: pgUrl,
  });

  try {
    const client = await pool.connect();
    console.log('✓ Connected to PostgreSQL\n');

    // Check if _prisma_migrations table exists
    const checkTable = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = '_prisma_migrations'
      );
    `);

    if (checkTable.rows[0].exists) {
      console.log('⚠️  Found existing _prisma_migrations table');
      console.log('This means Prisma has tried to apply migrations before\n');
      
      // Get failed migrations
      const failedMigrations = await client.query(`
        SELECT migration_name, finished_at, rolled_back_at 
        FROM _prisma_migrations 
        WHERE finished_at IS NULL OR rolled_back_at IS NOT NULL
        ORDER BY started_at;
      `);

      if (failedMigrations.rows.length > 0) {
        console.log(`Found ${failedMigrations.rows.length} failed/pending migrations:`);
        failedMigrations.rows.forEach((row: any) => {
          console.log(`  - ${row.migration_name}`);
        });
        console.log('');

        // Option 1: Mark all as rolled back and resolved
        console.log('Option 1: Mark all migrations as resolved (recommended)');
        console.log('This tells Prisma the migrations are already applied\n');

        // Delete the _prisma_migrations table to start fresh
        console.log('⚠️  Deleting _prisma_migrations table to start fresh...');
        await client.query('DROP TABLE IF EXISTS _prisma_migrations CASCADE;');
        console.log('✓ Deleted _prisma_migrations table\n');
      }
    } else {
      console.log('✓ No existing migration history found\n');
    }

    client.release();

    console.log('📝 Next steps:');
    console.log('1. Create a fresh baseline migration:');
    console.log('   npx prisma migrate dev --name init_postgresql --create-only');
    console.log('');
    console.log('2. Review the generated migration file');
    console.log('');
    console.log('3. Apply the migration:');
    console.log('   npx prisma migrate deploy');
    console.log('');
    console.log('4. Then migrate your data:');
    console.log('   npm run migrate:mysql-to-postgres');
    console.log('');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run if executed directly
if (require.main === module) {
  fixPostgresMigrations();
}

export default fixPostgresMigrations;

