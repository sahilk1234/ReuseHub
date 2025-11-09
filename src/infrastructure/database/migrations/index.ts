import { Migration } from './Migration';
import { CreateExtensionsMigration } from './001_create_extensions';
import { CreateUsersTableMigration } from './002_create_users_table';
import { CreateItemsTableMigration } from './003_create_items_table';
import { CreateExchangesTableMigration } from './004_create_exchanges_table';
import { CreateBadgesTableMigration } from './005_create_badges_table';
import { CreateAchievementsTableMigration } from './006_create_achievements_table';

export const migrations: Migration[] = [
  new CreateExtensionsMigration(),
  new CreateUsersTableMigration(),
  new CreateItemsTableMigration(),
  new CreateExchangesTableMigration(),
  new CreateBadgesTableMigration(),
  new CreateAchievementsTableMigration(),
];

export { MigrationRunner } from './MigrationRunner';
export { Migration, BaseMigration } from './Migration';