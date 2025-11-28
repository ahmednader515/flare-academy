import * as fs from 'fs';
import * as path from 'path';

/**
 * Helper script to update Prisma schema from MySQL to PostgreSQL
 * This updates the datasource provider and migration lock
 */

const SCHEMA_PATH = path.join(__dirname, '../prisma/schema.prisma');
const MIGRATION_LOCK_PATH = path.join(__dirname, '../prisma/migrations/migration_lock.toml');

function updateSchema() {
  console.log('📝 Updating Prisma schema to PostgreSQL...\n');

  // Read current schema
  let schemaContent = fs.readFileSync(SCHEMA_PATH, 'utf-8');

  // Update datasource provider
  if (schemaContent.includes('provider') && schemaContent.includes('mysql')) {
    schemaContent = schemaContent.replace(
      /provider\s*=\s*"mysql"/g,
      'provider = "postgresql"'
    );
    console.log('✓ Updated datasource provider from mysql to postgresql');
  } else if (schemaContent.includes('provider') && schemaContent.includes('postgresql')) {
    console.log('⚠ Schema already uses postgresql provider');
  } else {
    console.log('⚠ Could not find mysql provider in schema');
    // Try a more flexible search
    const mysqlMatch = schemaContent.match(/provider\s*=\s*"([^"]+)"/);
    if (mysqlMatch) {
      console.log(`  Found provider: ${mysqlMatch[1]}`);
      schemaContent = schemaContent.replace(
        /provider\s*=\s*"[^"]+"/,
        'provider = "postgresql"'
      );
      console.log('✓ Updated datasource provider to postgresql');
    }
  }

  // Write updated schema
  fs.writeFileSync(SCHEMA_PATH, schemaContent, 'utf-8');
  console.log('✓ Schema file updated\n');

  // Update migration lock if it exists
  if (fs.existsSync(MIGRATION_LOCK_PATH)) {
    let lockContent = fs.readFileSync(MIGRATION_LOCK_PATH, 'utf-8');
    
    if (lockContent.includes('provider = "mysql"')) {
      lockContent = lockContent.replace(
        /provider\s*=\s*"mysql"/,
        'provider = "postgresql"'
      );
      fs.writeFileSync(MIGRATION_LOCK_PATH, lockContent, 'utf-8');
      console.log('✓ Updated migration lock file');
    } else {
      console.log('⚠ Migration lock already uses postgresql or not found');
    }
  }

  console.log('\n✅ Schema update complete!');
  console.log('\nNext steps:');
  console.log('1. Update your DATABASE_URL to point to PostgreSQL');
  console.log('2. Run: npx prisma generate');
  console.log('3. Run: npx prisma migrate deploy (or npx prisma migrate dev)');
  console.log('4. Run: npm run migrate:mysql-to-postgres');
}

// Run if executed directly
if (require.main === module) {
  try {
    updateSchema();
  } catch (error: any) {
    console.error('❌ Error updating schema:', error.message);
    process.exit(1);
  }
}

export default updateSchema;

