import { BaseMigration } from './Migration';
import { DatabaseConnection } from '../DatabaseConnection';

export class CreateAchievementsTableMigration extends BaseMigration {
  id = '006_create_achievements_table';
  name = 'Create achievements table for user badge progress';

  async up(db: DatabaseConnection): Promise<void> {
    const columns = `
      id VARCHAR(255) PRIMARY KEY,
      user_id UUID NOT NULL,
      badge_id VARCHAR(255) NOT NULL,
      unlocked_at TIMESTAMP WITH TIME ZONE NOT NULL,
      progress NUMERIC NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (badge_id) REFERENCES badges(id) ON DELETE CASCADE,
      UNIQUE(user_id, badge_id)
    `;

    await this.createTable(db, 'achievements', columns);

    // Create indexes for performance
    await this.createIndex(db, 'idx_achievements_user_id', 'achievements', 'user_id');
    await this.createIndex(db, 'idx_achievements_badge_id', 'achievements', 'badge_id');
    await this.createIndex(db, 'idx_achievements_progress', 'achievements', 'progress');
    await this.createIndex(db, 'idx_achievements_unlocked_at', 'achievements', 'unlocked_at');

    console.log('✓ Created achievements table with indexes');
  }

  async down(db: DatabaseConnection): Promise<void> {
    await this.dropTable(db, 'achievements');
    console.log('✓ Dropped achievements table');
  }
}
