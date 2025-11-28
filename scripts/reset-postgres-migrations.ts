import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

/**
 * Script to reset PostgreSQL migrations and create a fresh baseline
 * This is needed when migrating from MySQL to PostgreSQL
 */

const MIGRATIONS_DIR = path.join(__dirname, '../prisma/migrations');

function resetPostgresMigrations() {
  console.log('🔄 Resetting PostgreSQL migration history...\n');

  try {
    // Check if we're using PostgreSQL
    const schemaPath = path.join(__dirname, '../prisma/schema.prisma');
    const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
    
    if (!schemaContent.includes('provider = "postgresql"')) {
      console.error('❌ Error: Schema is not set to PostgreSQL');
      console.log('Run: npm run migrate:update-schema first');
      process.exit(1);
    }

    console.log('⚠️  WARNING: This will reset the migration history in PostgreSQL');
    console.log('This is safe if you have a fresh PostgreSQL database.\n');

    // Option 1: Use Prisma migrate reset (drops and recreates database)
    console.log('Option 1: Reset database and create fresh migration');
    console.log('This will DROP all data in PostgreSQL!');
    console.log('Run: npx prisma migrate reset\n');

    // Option 2: Mark migrations as resolved and create baseline
    console.log('Option 2: Mark existing migrations as resolved (recommended for production)');
    console.log('This preserves your data but marks old MySQL migrations as applied');
    console.log('Then create a new migration from current schema\n');

    console.log('📝 Recommended steps:');
    console.log('1. If PostgreSQL is empty, run: npx prisma migrate reset');
    console.log('2. If PostgreSQL has data, run: npx prisma migrate resolve --applied <migration_name>');
    console.log('3. Then run: npx prisma migrate dev --name init_postgresql --create-only');
    console.log('4. Review the generated migration file');
    console.log('5. Run: npx prisma migrate deploy\n');

    console.log('💡 Alternative: Create baseline migration directly');
    console.log('Run: npx prisma migrate dev --name init_postgresql\n');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  resetPostgresMigrations();
}

export default resetPostgresMigrations;

