import { BaseMigration } from './Migration';
import { DatabaseConnection } from '../DatabaseConnection';

export class CreateUsersTableMigration extends BaseMigration {
  id = '002_create_users_table';
  name = 'Create users table with profile and location data';

  async up(db: DatabaseConnection): Promise<void> {
    const columns = `
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      email VARCHAR(255) UNIQUE NOT NULL,
      display_name VARCHAR(255) NOT NULL,
      phone VARCHAR(50),
      avatar TEXT,
      is_verified BOOLEAN DEFAULT FALSE,
      account_type VARCHAR(20) DEFAULT 'individual' CHECK (account_type IN ('individual', 'organization')),
      latitude DECIMAL(10, 8) NOT NULL,
      longitude DECIMAL(11, 8) NOT NULL,
      address TEXT NOT NULL,
      eco_points INTEGER DEFAULT 0,
      eco_points_transactions JSONB DEFAULT '[]'::jsonb,
      rating DECIMAL(3, 2) DEFAULT 0.0 CHECK (rating >= 0 AND rating <= 5),
      total_exchanges INTEGER DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    `;

    await this.createTable(db, 'users', columns);

    // Create indexes for performance
    await this.createIndex(db, 'idx_users_email', 'users', 'email');
    await this.createIndex(db, 'idx_users_location', 'users', 'latitude, longitude');
    await this.createIndex(db, 'idx_users_is_verified', 'users', 'is_verified');
    await this.createIndex(db, 'idx_users_account_type', 'users', 'account_type');
    await this.createIndex(db, 'idx_users_eco_points', 'users', 'eco_points');
    await this.createIndex(db, 'idx_users_rating', 'users', 'rating');
    await this.createIndex(db, 'idx_users_created_at', 'users', 'created_at');
    await this.createIndex(db, 'idx_users_updated_at', 'users', 'updated_at');

    // Create geographic index for location-based queries
    await db.query('CREATE INDEX IF NOT EXISTS idx_users_location_gist ON users USING GIST (ST_MakePoint(longitude, latitude))');

    console.log('✓ Created users table with indexes');
  }

  async down(db: DatabaseConnection): Promise<void> {
    await this.dropTable(db, 'users');
    console.log('✓ Dropped users table');
  }
}