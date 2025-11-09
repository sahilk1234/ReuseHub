import { DatabaseConnection } from '../DatabaseConnection';
import { Migration } from './Migration';

export interface MigrationRecord {
  id: string;
  name: string;
  executed_at: Date;
}

export class MigrationRunner {
  constructor(private db: DatabaseConnection) {}

  async initialize(): Promise<void> {
    // Create migrations table if it doesn't exist
    const query = `
      CREATE TABLE IF NOT EXISTS migrations (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;
    await this.db.query(query);
  }

  async getExecutedMigrations(): Promise<MigrationRecord[]> {
    const query = 'SELECT * FROM migrations ORDER BY executed_at ASC';
    const result = await this.db.query<MigrationRecord>(query);
    return result.rows;
  }

  async isMigrationExecuted(migrationId: string): Promise<boolean> {
    const query = 'SELECT COUNT(*) as count FROM migrations WHERE id = $1';
    const result = await this.db.query<{ count: string }>(query, [migrationId]);
    return parseInt(result.rows[0].count, 10) > 0;
  }

  async recordMigration(migration: Migration): Promise<void> {
    const query = 'INSERT INTO migrations (id, name) VALUES ($1, $2)';
    await this.db.query(query, [migration.id, migration.name]);
  }

  async removeMigrationRecord(migrationId: string): Promise<void> {
    const query = 'DELETE FROM migrations WHERE id = $1';
    await this.db.query(query, [migrationId]);
  }

  async runMigrations(migrations: Migration[]): Promise<void> {
    await this.initialize();

    console.log('Starting database migrations...');
    
    for (const migration of migrations) {
      const isExecuted = await this.isMigrationExecuted(migration.id);
      
      if (!isExecuted) {
        console.log(`Running migration: ${migration.name} (${migration.id})`);
        
        try {
          await this.db.transaction(async (trx) => {
            // Execute the migration within a transaction
            const migrationDb = {
              query: trx.query.bind(trx),
              transaction: this.db.transaction.bind(this.db),
              getClient: this.db.getClient.bind(this.db),
              close: this.db.close.bind(this.db),
              healthCheck: this.db.healthCheck.bind(this.db)
            } as DatabaseConnection;
            
            await migration.up(migrationDb);
            
            // Record the migration as executed
            await trx.query('INSERT INTO migrations (id, name) VALUES ($1, $2)', [migration.id, migration.name]);
          });
          
          console.log(`✓ Migration completed: ${migration.name}`);
        } catch (error) {
          console.error(`✗ Migration failed: ${migration.name}`, error);
          throw error;
        }
      } else {
        console.log(`⚬ Migration already executed: ${migration.name}`);
      }
    }
    
    console.log('All migrations completed successfully!');
  }

  async rollbackMigration(migration: Migration): Promise<void> {
    const isExecuted = await this.isMigrationExecuted(migration.id);
    
    if (isExecuted) {
      console.log(`Rolling back migration: ${migration.name} (${migration.id})`);
      
      try {
        await this.db.transaction(async (trx) => {
          // Execute the rollback within a transaction
          const migrationDb = {
            query: trx.query.bind(trx),
            transaction: this.db.transaction.bind(this.db),
            getClient: this.db.getClient.bind(this.db),
            close: this.db.close.bind(this.db),
            healthCheck: this.db.healthCheck.bind(this.db)
          } as DatabaseConnection;
          
          await migration.down(migrationDb);
          
          // Remove the migration record
          await trx.query('DELETE FROM migrations WHERE id = $1', [migration.id]);
        });
        
        console.log(`✓ Migration rolled back: ${migration.name}`);
      } catch (error) {
        console.error(`✗ Migration rollback failed: ${migration.name}`, error);
        throw error;
      }
    } else {
      console.log(`⚬ Migration not executed, nothing to rollback: ${migration.name}`);
    }
  }

  async rollbackLastMigration(migrations: Migration[]): Promise<void> {
    const executedMigrations = await this.getExecutedMigrations();
    
    if (executedMigrations.length === 0) {
      console.log('No migrations to rollback');
      return;
    }

    const lastExecuted = executedMigrations[executedMigrations.length - 1];
    const migration = migrations.find(m => m.id === lastExecuted.id);
    
    if (!migration) {
      throw new Error(`Migration not found: ${lastExecuted.id}`);
    }

    await this.rollbackMigration(migration);
  }

  async getMigrationStatus(migrations: Migration[]): Promise<Array<{ migration: Migration; executed: boolean; executedAt?: Date }>> {
    const executedMigrations = await this.getExecutedMigrations();
    const executedMap = new Map(executedMigrations.map(m => [m.id, m]));

    return migrations.map(migration => ({
      migration,
      executed: executedMap.has(migration.id),
      executedAt: executedMap.get(migration.id)?.executed_at
    }));
  }
}