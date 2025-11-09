import { BaseMigration } from './Migration';
import { DatabaseConnection } from '../DatabaseConnection';

export class CreateBadgesTableMigration extends BaseMigration {
  id = '005_create_badges_table';
  name = 'Create badges table for gamification';

  async up(db: DatabaseConnection): Promise<void> {
    const columns = `
      id VARCHAR(255) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      category VARCHAR(50) NOT NULL CHECK (category IN ('posting', 'exchanging', 'community', 'milestone', 'special')),
      icon_url TEXT,
      requirement_type VARCHAR(50) NOT NULL CHECK (requirement_type IN ('eco_points', 'exchanges', 'items_posted', 'rating', 'custom')),
      requirement_threshold NUMERIC NOT NULL,
      requirement_description TEXT NOT NULL,
      eco_points_reward INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    `;

    await this.createTable(db, 'badges', columns);

    // Create indexes for performance
    await this.createIndex(db, 'idx_badges_category', 'badges', 'category');
    await this.createIndex(db, 'idx_badges_requirement_type', 'badges', 'requirement_type');
    await this.createIndex(db, 'idx_badges_requirement_threshold', 'badges', 'requirement_threshold');

    console.log('✓ Created badges table with indexes');
  }

  async down(db: DatabaseConnection): Promise<void> {
    await this.dropTable(db, 'badges');
    console.log('✓ Dropped badges table');
  }
}
