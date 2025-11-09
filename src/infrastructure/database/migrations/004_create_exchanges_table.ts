import { BaseMigration } from './Migration';
import { DatabaseConnection } from '../DatabaseConnection';

export class CreateExchangesTableMigration extends BaseMigration {
  id = '004_create_exchanges_table';
  name = 'Create exchanges table with ratings and status tracking';

  async up(db: DatabaseConnection): Promise<void> {
    const columns = `
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
      giver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status VARCHAR(20) DEFAULT 'requested' CHECK (status IN ('requested', 'accepted', 'completed', 'cancelled')),
      scheduled_pickup TIMESTAMP WITH TIME ZONE,
      completed_at TIMESTAMP WITH TIME ZONE,
      giver_rating_score INTEGER CHECK (giver_rating_score >= 1 AND giver_rating_score <= 5),
      giver_rating_review TEXT,
      giver_rating_rated_by UUID REFERENCES users(id),
      giver_rating_rated_at TIMESTAMP WITH TIME ZONE,
      receiver_rating_score INTEGER CHECK (receiver_rating_score >= 1 AND receiver_rating_score <= 5),
      receiver_rating_review TEXT,
      receiver_rating_rated_by UUID REFERENCES users(id),
      receiver_rating_rated_at TIMESTAMP WITH TIME ZONE,
      eco_points_awarded INTEGER DEFAULT 0,
      cancellation_reason TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      CONSTRAINT check_different_users CHECK (giver_id != receiver_id),
      CONSTRAINT check_giver_rating_consistency CHECK (
        (giver_rating_score IS NULL AND giver_rating_review IS NULL AND giver_rating_rated_by IS NULL AND giver_rating_rated_at IS NULL) OR
        (giver_rating_score IS NOT NULL AND giver_rating_rated_by IS NOT NULL AND giver_rating_rated_at IS NOT NULL)
      ),
      CONSTRAINT check_receiver_rating_consistency CHECK (
        (receiver_rating_score IS NULL AND receiver_rating_review IS NULL AND receiver_rating_rated_by IS NULL AND receiver_rating_rated_at IS NULL) OR
        (receiver_rating_score IS NOT NULL AND receiver_rating_rated_by IS NOT NULL AND receiver_rating_rated_at IS NOT NULL)
      )
    `;

    await this.createTable(db, 'exchanges', columns);

    // Create indexes for performance
    await this.createIndex(db, 'idx_exchanges_item_id', 'exchanges', 'item_id');
    await this.createIndex(db, 'idx_exchanges_giver_id', 'exchanges', 'giver_id');
    await this.createIndex(db, 'idx_exchanges_receiver_id', 'exchanges', 'receiver_id');
    await this.createIndex(db, 'idx_exchanges_status', 'exchanges', 'status');
    await this.createIndex(db, 'idx_exchanges_created_at', 'exchanges', 'created_at');
    await this.createIndex(db, 'idx_exchanges_updated_at', 'exchanges', 'updated_at');
    await this.createIndex(db, 'idx_exchanges_completed_at', 'exchanges', 'completed_at');
    await this.createIndex(db, 'idx_exchanges_scheduled_pickup', 'exchanges', 'scheduled_pickup');

    // Create composite indexes for common queries
    await this.createIndex(db, 'idx_exchanges_giver_status', 'exchanges', 'giver_id, status');
    await this.createIndex(db, 'idx_exchanges_receiver_status', 'exchanges', 'receiver_id, status');
    await this.createIndex(db, 'idx_exchanges_item_status', 'exchanges', 'item_id, status');

    // Create indexes for rating queries
    await this.createIndex(db, 'idx_exchanges_giver_rating', 'exchanges', 'giver_rating_score');
    await this.createIndex(db, 'idx_exchanges_receiver_rating', 'exchanges', 'receiver_rating_score');

    // Create index for overdue exchanges
    await this.createIndex(db, 'idx_exchanges_overdue', 'exchanges', 'scheduled_pickup, status', 'WHERE scheduled_pickup IS NOT NULL AND status IN (\'requested\', \'accepted\')');

    // Create index for unrated completed exchanges
    await this.createIndex(db, 'idx_exchanges_unrated', 'exchanges', 'status, completed_at', 'WHERE status = \'completed\' AND (giver_rating_score IS NULL OR receiver_rating_score IS NULL)');

    console.log('✓ Created exchanges table with indexes');
  }

  async down(db: DatabaseConnection): Promise<void> {
    await this.dropTable(db, 'exchanges');
    console.log('✓ Dropped exchanges table');
  }
}