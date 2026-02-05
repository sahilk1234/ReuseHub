import { BaseMigration } from './Migration';
import { DatabaseConnection } from '../DatabaseConnection';

export class AddExchangeHandoffConfirmationsMigration extends BaseMigration {
  id = '008_add_exchange_handoff_confirmations';
  name = 'Add handoff confirmation timestamps to exchanges';

  async up(db: DatabaseConnection): Promise<void> {
    await this.addColumn(db, 'exchanges', 'giver_confirmed_at TIMESTAMP WITH TIME ZONE');
    await this.addColumn(db, 'exchanges', 'receiver_confirmed_at TIMESTAMP WITH TIME ZONE');
    await this.createIndex(db, 'idx_exchanges_handoff_confirmed', 'exchanges', 'giver_confirmed_at, receiver_confirmed_at');
    console.log('✓ Added handoff confirmation fields to exchanges');
  }

  async down(db: DatabaseConnection): Promise<void> {
    await this.dropIndex(db, 'idx_exchanges_handoff_confirmed');
    await this.dropColumn(db, 'exchanges', 'giver_confirmed_at');
    await this.dropColumn(db, 'exchanges', 'receiver_confirmed_at');
    console.log('✓ Dropped handoff confirmation fields from exchanges');
  }
}
