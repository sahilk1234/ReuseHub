import { BaseMigration } from './Migration';
import { DatabaseConnection } from '../DatabaseConnection';

export class CreateItemsTableMigration extends BaseMigration {
  id = '003_create_items_table';
  name = 'Create items table with details and location data';

  async up(db: DatabaseConnection): Promise<void> {
    const columns = `
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      category VARCHAR(100) NOT NULL,
      tags JSONB DEFAULT '[]'::jsonb,
      images JSONB DEFAULT '[]'::jsonb,
      condition VARCHAR(20) NOT NULL CHECK (condition IN ('new', 'like-new', 'good', 'fair', 'poor')),
      status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'pending', 'exchanged', 'removed')),
      latitude DECIMAL(10, 8) NOT NULL,
      longitude DECIMAL(11, 8) NOT NULL,
      address TEXT NOT NULL,
      dimensions JSONB,
      pickup_instructions TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    `;

    await this.createTable(db, 'items', columns);

    // Create indexes for performance
    await this.createIndex(db, 'idx_items_user_id', 'items', 'user_id');
    await this.createIndex(db, 'idx_items_category', 'items', 'category');
    await this.createIndex(db, 'idx_items_status', 'items', 'status');
    await this.createIndex(db, 'idx_items_condition', 'items', 'condition');
    await this.createIndex(db, 'idx_items_location', 'items', 'latitude, longitude');
    await this.createIndex(db, 'idx_items_created_at', 'items', 'created_at');
    await this.createIndex(db, 'idx_items_updated_at', 'items', 'updated_at');

    // Create geographic index for location-based queries
    await db.query('CREATE INDEX IF NOT EXISTS idx_items_location_gist ON items USING GIST (ST_MakePoint(longitude, latitude))');

    // Create GIN indexes for JSONB columns
    await db.query('CREATE INDEX IF NOT EXISTS idx_items_tags_gin ON items USING GIN (tags)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_items_images_gin ON items USING GIN (images)');

    // Create composite indexes for common queries
    await this.createIndex(db, 'idx_items_status_category', 'items', 'status, category');
    await this.createIndex(db, 'idx_items_user_status', 'items', 'user_id, status');

    console.log('✓ Created items table with indexes');
  }

  async down(db: DatabaseConnection): Promise<void> {
    await this.dropTable(db, 'items');
    console.log('✓ Dropped items table');
  }
}