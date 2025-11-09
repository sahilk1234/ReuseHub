import { DatabaseConnection } from '../DatabaseConnection';

export interface Migration {
  id: string;
  name: string;
  up(db: DatabaseConnection): Promise<void>;
  down(db: DatabaseConnection): Promise<void>;
}

export abstract class BaseMigration implements Migration {
  abstract id: string;
  abstract name: string;
  
  abstract up(db: DatabaseConnection): Promise<void>;
  abstract down(db: DatabaseConnection): Promise<void>;

  protected async createTable(db: DatabaseConnection, tableName: string, columns: string): Promise<void> {
    const query = `CREATE TABLE IF NOT EXISTS ${tableName} (${columns})`;
    await db.query(query);
  }

  protected async dropTable(db: DatabaseConnection, tableName: string): Promise<void> {
    const query = `DROP TABLE IF EXISTS ${tableName} CASCADE`;
    await db.query(query);
  }

  protected async addColumn(db: DatabaseConnection, tableName: string, columnDefinition: string): Promise<void> {
    const query = `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS ${columnDefinition}`;
    await db.query(query);
  }

  protected async dropColumn(db: DatabaseConnection, tableName: string, columnName: string): Promise<void> {
    const query = `ALTER TABLE ${tableName} DROP COLUMN IF EXISTS ${columnName}`;
    await db.query(query);
  }

  protected async createIndex(db: DatabaseConnection, indexName: string, tableName: string, columns: string, options?: string): Promise<void> {
    const optionsStr = options ? ` ${options}` : '';
    const query = `CREATE INDEX IF NOT EXISTS ${indexName} ON ${tableName} (${columns})${optionsStr}`;
    await db.query(query);
  }

  protected async dropIndex(db: DatabaseConnection, indexName: string): Promise<void> {
    const query = `DROP INDEX IF EXISTS ${indexName}`;
    await db.query(query);
  }

  protected async enableExtension(db: DatabaseConnection, extensionName: string): Promise<void> {
    const query = `CREATE EXTENSION IF NOT EXISTS "${extensionName}"`;
    await db.query(query);
  }
}