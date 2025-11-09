import { injectable, inject } from 'inversify';
import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { TYPES } from '@/container/types';
import { DatabaseConfig, AppConfig } from '../../config/AppConfig';

export interface DatabaseTransaction {
  query<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<T>>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

@injectable()
export class DatabaseConnection {
  private pool: Pool;

  constructor(
    @inject(TYPES.AppConfig)
    appConfig: AppConfig
  ) {
    const config = appConfig.database;
    this.pool = new Pool({
      connectionString: config.connection,
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.username,
      password: config.password,
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
      connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
    });

    // Handle pool errors
    this.pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
    });
  }

  async query<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
    const start = Date.now();
    try {
      const result = await this.pool.query<T>(text, params);
      const duration = Date.now() - start;
      
      // Only log slow queries (> 100ms) or in verbose mode
      if (duration > 100 || process.env.DB_QUERY_LOGGING === 'verbose') {
        console.log('Executed query', { text, duration, rows: result.rowCount });
      }
      
      return result;
    } catch (error) {
      console.error('Database query error', { text, params, error });
      throw error;
    }
  }

  async getClient(): Promise<PoolClient> {
    return this.pool.connect();
  }

  async transaction<T>(callback: (trx: DatabaseTransaction) => Promise<T>): Promise<T> {
    const client = await this.getClient();
    
    try {
      await client.query('BEGIN');
      
      const transaction: DatabaseTransaction = {
        query: <U extends QueryResultRow = any>(text: string, params?: any[]) => client.query<U>(text, params),
        commit: async () => { await client.query('COMMIT'); },
        rollback: async () => { await client.query('ROLLBACK'); }
      };

      const result = await callback(transaction);
      await transaction.commit();
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.query('SELECT 1');
      return true;
    } catch (error) {
      console.error('Database health check failed', error);
      return false;
    }
  }
}