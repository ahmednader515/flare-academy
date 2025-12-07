import mysql from 'mysql2/promise';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Define table order based on foreign key dependencies
const TABLE_ORDER = [
  'User',                    // No dependencies
  'Course',                   // Depends on User
  'Attachment',               // Depends on Course
  'Chapter',                  // Depends on Course
  'ChapterAttachment',        // Depends on Chapter
  'UserProgress',             // Depends on User and Chapter
  'Purchase',                 // Depends on User and Course
  'BalanceTransaction',        // Depends on User
  'Quiz',                     // Depends on Course
  'Question',                 // Depends on Quiz
  'QuizResult',               // Depends on User and Quiz
  'QuizAnswer',               // Depends on Question and QuizResult
  'SavedDocument',            // Depends on User
];

// Map MySQL table names to Prisma model names (if different)
const TABLE_NAME_MAP: Record<string, string> = {
  'User': 'User',
  'Course': 'Course',
  'Attachment': 'Attachment',
  'Chapter': 'Chapter',
  'ChapterAttachment': 'ChapterAttachment',
  'UserProgress': 'UserProgress',
  'Purchase': 'Purchase',
  'BalanceTransaction': 'BalanceTransaction',
  'Quiz': 'Quiz',
  'Question': 'Question',
  'QuizResult': 'QuizResult',
  'QuizAnswer': 'QuizAnswer',
  'SavedDocument': 'SavedDocument',
};

interface MigrationStats {
  table: string;
  rowsExported: number;
  rowsImported: number;
  errors: string[];
}

class DatabaseMigrator {
  private mysqlConnection: mysql.Connection | null = null;
  private pgPool: Pool | null = null;
  private stats: MigrationStats[] = [];

  async connectMySQL(): Promise<void> {
    // Try MYSQL_DATABASE_URL first, then fall back to DATABASE_URL if it's MySQL
    let mysqlUrl = process.env.MYSQL_DATABASE_URL;
    
    if (!mysqlUrl) {
      // Check if DATABASE_URL is MySQL
      const dbUrl = process.env.DATABASE_URL;
      if (dbUrl && (dbUrl.startsWith('mysql://') || dbUrl.startsWith('mysql2://'))) {
        mysqlUrl = dbUrl;
      } else {
        throw new Error(
          'MySQL connection string not found. Please set MYSQL_DATABASE_URL environment variable.\n' +
          'Example: MYSQL_DATABASE_URL="mysql://user:password@host:3306/database"'
        );
      }
    }

    if (!mysqlUrl) {
      throw new Error('MySQL connection string not found. Set MYSQL_DATABASE_URL environment variable.');
    }

    // Parse MySQL connection string
    const url = new URL(mysqlUrl.replace(/^mysql2?:\/\//, 'http://'));
    const host = url.hostname;
    const port = parseInt(url.port) || 3306;
    const user = url.username;
    const password = url.password;
    const database = url.pathname.slice(1);

    console.log(`Connecting to MySQL: ${host}:${port}/${database}`);

    this.mysqlConnection = await mysql.createConnection({
      host,
      port,
      user,
      password,
      database,
      multipleStatements: true,
    });

    console.log('✓ Connected to MySQL');
  }

  async connectPostgreSQL(): Promise<void> {
    const pgUrl = process.env.POSTGRES_DATABASE_URL || process.env.DATABASE_URL;
    if (!pgUrl) {
      throw new Error('POSTGRES_DATABASE_URL or DATABASE_URL environment variable is not set');
    }

    console.log('Connecting to PostgreSQL...');

    // Parse connection string to extract components
    let cleanUrl = pgUrl;
    const url = new URL(pgUrl.replace(/^postgres(ql)?:\/\//, 'http://'));
    
    // Check if it's a cloud provider that requires SSL
    const isCloudProvider = url.hostname.includes('aiven') || 
                           url.hostname.includes('aivencloud.com') ||
                           url.hostname.includes('cloud');

    // Remove SSL parameters from URL to set them explicitly
    cleanUrl = cleanUrl.split('?')[0]; // Remove query parameters
    
    // For cloud providers, always use SSL with self-signed cert acceptance
    // This is necessary for Aiven and similar providers
    const sslConfig = isCloudProvider ? {
      rejectUnauthorized: false, // Accept self-signed certificates
    } : undefined;

    // Create pool with explicit SSL configuration
    this.pgPool = new Pool({
      connectionString: cleanUrl,
      ssl: sslConfig,
    });

    // Test connection
    try {
      const client = await this.pgPool.connect();
      client.release();
      console.log('✓ Connected to PostgreSQL');
    } catch (error: any) {
      // If still failing, try with the original URL but force SSL config
      if (error.code === 'SELF_SIGNED_CERT_IN_CHAIN' || 
          error.message.includes('certificate') || 
          error.message.includes('SSL')) {
        console.log('⚠️  Adjusting SSL configuration for cloud provider...');
        
        if (this.pgPool) {
          await this.pgPool.end();
        }
        
        // Force SSL config regardless of connection string
        this.pgPool = new Pool({
          connectionString: pgUrl,
          ssl: {
            rejectUnauthorized: false,
          },
        });
        
        const client = await this.pgPool.connect();
        client.release();
        console.log('✓ Connected to PostgreSQL (with SSL certificate acceptance)');
      } else {
        throw error;
      }
    }
  }

  async disconnect(): Promise<void> {
    if (this.mysqlConnection) {
      await this.mysqlConnection.end();
      console.log('✓ Disconnected from MySQL');
    }
    if (this.pgPool) {
      await this.pgPool.end();
      console.log('✓ Disconnected from PostgreSQL');
    }
  }

  // Convert MySQL value to PostgreSQL-compatible value
  private convertValue(value: any, columnType: string): any {
    if (value === null || value === undefined) {
      return null;
    }

    // Handle boolean values
    if (columnType.includes('tinyint(1)') || columnType.includes('boolean')) {
      return value === 1 || value === true;
    }

    // Handle JSON/Text fields
    if (columnType.includes('json') || columnType.includes('text')) {
      if (typeof value === 'string') {
        return value;
      }
      return JSON.stringify(value);
    }

    // Handle dates
    if (value instanceof Date) {
      return value.toISOString();
    }

    return value;
  }

  // Get table name in database (Prisma uses model name as table name)
  private getTableName(modelName: string): string {
    return TABLE_NAME_MAP[modelName] || modelName;
  }

  // Discover actual table name in MySQL database
  private async discoverTableName(modelName: string): Promise<string | null> {
    if (!this.mysqlConnection) {
      throw new Error('MySQL connection not established');
    }

    const possibleNames = [
      modelName,
      modelName.toLowerCase(),
      modelName.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, ''),
    ];

    for (const name of possibleNames) {
      try {
        const [rows] = await this.mysqlConnection.execute(
          `SELECT 1 FROM \`${name}\` LIMIT 1`
        );
        return name;
      } catch (error) {
        // Try next name
        continue;
      }
    }

    return null;
  }

  async exportTableData(tableName: string): Promise<any[]> {
    if (!this.mysqlConnection) {
      throw new Error('MySQL connection not established');
    }

    const actualTableName = await this.discoverTableName(tableName);
    if (!actualTableName) {
      console.warn(`  ⚠ Table ${tableName} not found in MySQL database`);
      return [];
    }

    const query = `SELECT * FROM \`${actualTableName}\``;
    const [rows] = await this.mysqlConnection.execute(query);
    return rows as any[];
  }

  async getTableColumns(tableName: string): Promise<Array<{ name: string; type: string }>> {
    if (!this.mysqlConnection) {
      throw new Error('MySQL connection not established');
    }

    const actualTableName = await this.discoverTableName(tableName);
    if (!actualTableName) {
      return [];
    }

    const query = `DESCRIBE \`${actualTableName}\``;
    const [columns] = await this.mysqlConnection.execute(query);
    
    return (columns as any[]).map((col: any) => ({
      name: col.Field,
      type: col.Type,
    }));
  }

  async importTableData(
    tableName: string,
    data: any[],
    columns: Array<{ name: string; type: string }>
  ): Promise<number> {
    if (!this.pgPool) {
      throw new Error('PostgreSQL connection not established');
    }

    if (data.length === 0) {
      console.log(`  No data to import for ${tableName}`);
      return 0;
    }

    const dbTableName = this.getTableName(tableName);
    const columnNames = columns.map(col => col.name);
    const columnList = columnNames.map(col => `"${col}"`).join(', ');

    const client = await this.pgPool.connect();

    try {
      // Start transaction
      await client.query('BEGIN');

      // Use batch insert for better performance (100 rows at a time)
      const batchSize = 100;
      let importedCount = 0;

      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        const values: any[] = [];
        const placeholders: string[] = [];
        let paramIndex = 1;

        batch.forEach((row) => {
          const rowPlaceholders: string[] = [];
          columnNames.forEach((colName) => {
            const col = columns.find(c => c.name === colName);
            const value = row[colName];
            values.push(this.convertValue(value, col?.type || ''));
            rowPlaceholders.push(`$${paramIndex++}`);
          });
          placeholders.push(`(${rowPlaceholders.join(', ')})`);
        });

        const insertQuery = `
          INSERT INTO "${dbTableName}" (${columnList})
          VALUES ${placeholders.join(', ')}
          ON CONFLICT DO NOTHING
        `;

        try {
          const result = await client.query(insertQuery, values);
          importedCount += result.rowCount || 0;
        } catch (error: any) {
          // If batch insert fails, try individual inserts
          console.log(`  Batch insert failed, trying individual inserts...`);
          for (const row of batch) {
            const rowValues = columnNames.map(colName => {
              const col = columns.find(c => c.name === colName);
              const value = row[colName];
              return this.convertValue(value, col?.type || '');
            });
            const rowPlaceholders = columnNames.map((_, idx) => `$${idx + 1}`).join(', ');

            try {
              const insertQuerySingle = `
                INSERT INTO "${dbTableName}" (${columnList})
                VALUES (${rowPlaceholders})
                ON CONFLICT DO NOTHING
              `;
              await client.query(insertQuerySingle, rowValues);
              importedCount++;
            } catch (error2: any) {
              // Try without ON CONFLICT
              try {
                const insertQueryNoConflict = `
                  INSERT INTO "${dbTableName}" (${columnList})
                  VALUES (${rowPlaceholders})
                `;
                await client.query(insertQueryNoConflict, rowValues);
                importedCount++;
              } catch (error3: any) {
                console.error(`  Error inserting row:`, error3.message);
                // Continue with next row
              }
            }
          }
        }
      }

      await client.query('COMMIT');
      return importedCount;
    } catch (error: any) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async migrateTable(tableName: string): Promise<MigrationStats> {
    console.log(`\n📦 Migrating table: ${tableName}`);
    
    const stats: MigrationStats = {
      table: tableName,
      rowsExported: 0,
      rowsImported: 0,
      errors: [],
    };

    try {
      // Export data from MySQL
      const data = await this.exportTableData(tableName);
      stats.rowsExported = data.length;
      console.log(`  ✓ Exported ${data.length} rows from MySQL`);

      if (data.length === 0) {
        console.log(`  ⚠ No data found in ${tableName}`);
        return stats;
      }

      // Get column information
      const columns = await this.getTableColumns(tableName);
      if (columns.length === 0) {
        console.log(`  ⚠ No columns found for ${tableName}`);
        return stats;
      }
      console.log(`  ✓ Found ${columns.length} columns`);

      // Import data to PostgreSQL
      const importedCount = await this.importTableData(tableName, data, columns);
      stats.rowsImported = importedCount;
      console.log(`  ✓ Imported ${importedCount} rows to PostgreSQL`);

      if (importedCount !== data.length) {
        const diff = data.length - importedCount;
        stats.errors.push(`${diff} rows failed to import`);
        console.log(`  ⚠ Warning: ${diff} rows were not imported`);
      }
    } catch (error: any) {
      stats.errors.push(error.message);
      console.error(`  ✗ Error migrating ${tableName}:`, error.message);
    }

    return stats;
  }

  async migrate(): Promise<void> {
    console.log('🚀 Starting MySQL to PostgreSQL Migration\n');
    console.log('=' .repeat(50));

    try {
      // Connect to both databases
      await this.connectMySQL();
      await this.connectPostgreSQL();

      // Disable foreign key checks temporarily in PostgreSQL
      if (this.pgPool) {
        const client = await this.pgPool.connect();
        try {
          // Note: PostgreSQL doesn't have a simple way to disable FK checks
          // We'll handle this by importing in the correct order
          await client.query('SET session_replication_role = replica;');
        } catch (error) {
          // Ignore if not supported
        } finally {
          client.release();
        }
      }

      // Migrate each table in order
      for (const tableName of TABLE_ORDER) {
        const stats = await this.migrateTable(tableName);
        this.stats.push(stats);
      }

      // Re-enable foreign key checks
      if (this.pgPool) {
        const client = await this.pgPool.connect();
        try {
          await client.query('SET session_replication_role = DEFAULT;');
        } catch (error) {
          // Ignore if not supported
        } finally {
          client.release();
        }
      }

      // Print summary
      this.printSummary();
    } catch (error: any) {
      console.error('\n❌ Migration failed:', error.message);
      throw error;
    } finally {
      await this.disconnect();
    }
  }

  printSummary(): void {
    console.log('\n' + '='.repeat(50));
    console.log('📊 Migration Summary');
    console.log('='.repeat(50));

    let totalExported = 0;
    let totalImported = 0;
    let totalErrors = 0;

    for (const stat of this.stats) {
      totalExported += stat.rowsExported;
      totalImported += stat.rowsImported;
      totalErrors += stat.errors.length;

      const status = stat.errors.length > 0 ? '⚠' : '✓';
      console.log(
        `${status} ${stat.table}: ${stat.rowsExported} exported, ${stat.rowsImported} imported`
      );
      
      if (stat.errors.length > 0) {
        stat.errors.forEach(error => {
          console.log(`    Error: ${error}`);
        });
      }
    }

    console.log('\n' + '-'.repeat(50));
    console.log(`Total: ${totalExported} rows exported, ${totalImported} rows imported`);
    
    if (totalErrors > 0) {
      console.log(`⚠ ${totalErrors} errors encountered`);
    } else {
      console.log('✓ Migration completed successfully!');
    }
  }
}

// Main execution
async function main() {
  const migrator = new DatabaseMigrator();
  
  try {
    await migrator.migrate();
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export default DatabaseMigrator;

