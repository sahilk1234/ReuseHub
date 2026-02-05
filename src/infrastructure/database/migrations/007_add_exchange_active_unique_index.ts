import { BaseMigration } from './Migration';
import { DatabaseConnection } from '../DatabaseConnection';

export class AddExchangeActiveUniqueIndexMigration extends BaseMigration {
  id = '007_add_exchange_active_unique_index';
  name = 'Add unique constraint for active exchange per item';

  async up(db: DatabaseConnection): Promise<void> {
    await db.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_exchanges_item_active_unique
       ON exchanges (item_id)
       WHERE status IN ('requested', 'accepted')`
    );
    console.log('✓ Created unique index for active exchanges per item');
  }

  async down(db: DatabaseConnection): Promise<void> {
    await this.dropIndex(db, 'idx_exchanges_item_active_unique');
    console.log('✓ Dropped unique index for active exchanges per item');
  }
}
