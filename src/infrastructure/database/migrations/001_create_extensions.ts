import { BaseMigration } from './Migration';
import { DatabaseConnection } from '../DatabaseConnection';

export class CreateExtensionsMigration extends BaseMigration {
  id = '001_create_extensions';
  name = 'Create PostgreSQL extensions for geographic queries and text search';

  async up(db: DatabaseConnection): Promise<void> {
    // Enable PostGIS extension for geographic queries
    await this.enableExtension(db, 'postgis');
    
    // Enable pg_trgm extension for similarity searches
    await this.enableExtension(db, 'pg_trgm');
    
    // Enable uuid-ossp extension for UUID generation
    await this.enableExtension(db, 'uuid-ossp');
    
    console.log('✓ Created PostgreSQL extensions: postgis, pg_trgm, uuid-ossp');
  }

  async down(db: DatabaseConnection): Promise<void> {
    await db.query('DROP EXTENSION IF EXISTS uuid-ossp');
    await db.query('DROP EXTENSION IF EXISTS pg_trgm');
    await db.query('DROP EXTENSION IF EXISTS postgis');
    
    console.log('✓ Dropped PostgreSQL extensions');
  }
}