import { BaseMigration } from './Migration';
import { DatabaseConnection } from '../DatabaseConnection';

export class AddPasswordToUsersMigration extends BaseMigration {
  id = '007_add_password_to_users';
  name = 'Add password hash field to users table';

  async up(db: DatabaseConnection): Promise<void> {
    await db.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255)
    `);

    console.log('✓ Added password_hash column to users table');
  }

  async down(db: DatabaseConnection): Promise<void> {
    await db.query(`
      ALTER TABLE users 
      DROP COLUMN IF EXISTS password_hash
    `);

    console.log('✓ Removed password_hash column from users table');
  }
}
