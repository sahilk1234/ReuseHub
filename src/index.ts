import { App } from './app';
import { DIContainer } from './container/Container';
import { TYPES } from './container/types';
import { DatabaseConnection } from './infrastructure/database/DatabaseConnection';
import { MigrationRunner } from './infrastructure/database/migrations/MigrationRunner';

// Import all migrations
import { CreateExtensionsMigration } from './infrastructure/database/migrations/001_create_extensions';
import { CreateUsersTableMigration } from './infrastructure/database/migrations/002_create_users_table';
import { CreateItemsTableMigration } from './infrastructure/database/migrations/003_create_items_table';
import { CreateExchangesTableMigration } from './infrastructure/database/migrations/004_create_exchanges_table';
import { CreateBadgesTableMigration } from './infrastructure/database/migrations/005_create_badges_table';
import { CreateAchievementsTableMigration } from './infrastructure/database/migrations/006_create_achievements_table';
import { AddPasswordToUsersMigration } from './infrastructure/database/migrations/007_add_password_to_users';

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Run database migrations before starting the app
async function runMigrations(): Promise<void> {
  try {
    console.log('🔄 Checking database migrations...');
    
    const container = DIContainer.getInstance();
    const db = container.get<DatabaseConnection>(TYPES.DatabaseConnection);
    const migrationRunner = new MigrationRunner(db);

    // List of all migrations in order
    const migrations = [
      new CreateExtensionsMigration(),
      new CreateUsersTableMigration(),
      new CreateItemsTableMigration(),
      new CreateExchangesTableMigration(),
      new CreateBadgesTableMigration(),
      new CreateAchievementsTableMigration(),
      new AddPasswordToUsersMigration(),
    ];

    await migrationRunner.runMigrations(migrations);
    console.log('✅ Database migrations completed successfully\n');
  } catch (error) {
    console.error('❌ Database migration failed:', error);
    throw error;
  }
}

// Start the application
async function start() {
  try {
    // Run migrations first
    await runMigrations();
    
    // Then start the server
    const app = new App();
    app.listen();
  } catch (error) {
    console.error('Failed to start application:', error);
    process.exit(1);
  }
}

start();