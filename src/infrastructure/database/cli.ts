#!/usr/bin/env node

import { DatabaseConnection } from './DatabaseConnection';
import { MigrationRunner, migrations } from './migrations';
import { SeedData } from './seeds/SeedData';
import { DIContainer } from '../../container/Container';
import { TYPES } from '../../container/types';

async function main() {
  const command = process.argv[2];
  
  // Get DatabaseConnection from DI container
  const container = DIContainer.getInstance();
  const db = container.get<DatabaseConnection>(TYPES.DatabaseConnection);

  try {
    switch (command) {
      case 'migrate':
        await runMigrations(db);
        break;
      case 'rollback':
        await rollbackMigration(db);
        break;
      case 'seed':
        await runSeeds(db);
        break;
      case 'reset':
        await resetDatabase(db);
        break;
      case 'status':
        await showMigrationStatus(db);
        break;
      default:
        showHelp();
    }
  } catch (error) {
    console.error('Command failed:', error);
    process.exit(1);
  } finally {
    await db.close();
  }
}

async function runMigrations(db: DatabaseConnection) {
  console.log('Running database migrations...');
  const runner = new MigrationRunner(db);
  await runner.runMigrations(migrations);
}

async function rollbackMigration(db: DatabaseConnection) {
  console.log('Rolling back last migration...');
  const runner = new MigrationRunner(db);
  await runner.rollbackLastMigration(migrations);
}

async function runSeeds(db: DatabaseConnection) {
  console.log('Running database seeds...');
  const seeder = new SeedData(db);
  await seeder.seedAll();
}

async function resetDatabase(db: DatabaseConnection) {
  console.log('Resetting database (rollback all migrations and re-run with seeds)...');
  
  const runner = new MigrationRunner(db);
  const seeder = new SeedData(db);
  
  // Rollback all migrations
  const reversedMigrations = [...migrations].reverse();
  for (const migration of reversedMigrations) {
    try {
      await runner.rollbackMigration(migration);
    } catch (error) {
      console.log(`Migration ${migration.id} was not executed, skipping rollback`);
    }
  }
  
  // Run all migrations
  await runner.runMigrations(migrations);
  
  // Run seeds
  await seeder.seedAll();
  
  console.log('✓ Database reset completed!');
}

async function showMigrationStatus(db: DatabaseConnection) {
  console.log('Migration Status:');
  console.log('================');
  
  const runner = new MigrationRunner(db);
  const status = await runner.getMigrationStatus(migrations);
  
  for (const { migration, executed, executedAt } of status) {
    const statusIcon = executed ? '✓' : '✗';
    const executedInfo = executed && executedAt ? ` (executed: ${executedAt.toISOString()})` : '';
    console.log(`${statusIcon} ${migration.id}: ${migration.name}${executedInfo}`);
  }
}

function showHelp() {
  console.log(`
Database CLI Tool

Usage: npm run db <command>

Commands:
  migrate   Run all pending migrations
  rollback  Rollback the last migration
  seed      Run database seeds (populate with sample data)
  reset     Reset database (rollback all, migrate, and seed)
  status    Show migration status

Examples:
  npm run db migrate
  npm run db seed
  npm run db reset
  npm run db status
`);
}

// Run the CLI if this file is executed directly
if (require.main === module) {
  main();
}

export { main as runDatabaseCLI };