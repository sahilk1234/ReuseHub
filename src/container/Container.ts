import { Container } from 'inversify';
import { AppConfig } from '@/config/AppConfig';
import { ConfigLoader } from '@/config/ConfigLoader';
import { TYPES } from './types';

export class DIContainer {
  private static instance: Container;

  static getInstance(): Container {
    if (!DIContainer.instance) {
      DIContainer.instance = new Container();
      DIContainer.configureContainer();
    }
    return DIContainer.instance;
  }

  private static configureContainer(): void {
    const container = DIContainer.instance;
    const config = ConfigLoader.load();

    // Bind configuration
    container.bind<AppConfig>(TYPES.AppConfig).toConstantValue(config);

    // Import and bind database connection
    const { DatabaseConnection } = require('@/infrastructure/database/DatabaseConnection');
    container.bind(TYPES.DatabaseConnection).to(DatabaseConnection).inSingletonScope();

    // Import and bind repositories
    const { PostgreSQLUserRepository } = require('@/infrastructure/repositories/postgresql/PostgreSQLUserRepository');
    const { PostgreSQLItemRepository } = require('@/infrastructure/repositories/postgresql/PostgreSQLItemRepository');
    const { PostgreSQLExchangeRepository } = require('@/infrastructure/repositories/postgresql/PostgreSQLExchangeRepository');
    const { PostgreSQLBadgeRepository } = require('@/infrastructure/repositories/postgresql/PostgreSQLBadgeRepository');
    const { PostgreSQLAchievementRepository } = require('@/infrastructure/repositories/postgresql/PostgreSQLAchievementRepository');

    container.bind(TYPES.IUserRepository).to(PostgreSQLUserRepository).inSingletonScope();
    container.bind(TYPES.IItemRepository).to(PostgreSQLItemRepository).inSingletonScope();
    container.bind(TYPES.IExchangeRepository).to(PostgreSQLExchangeRepository).inSingletonScope();
    container.bind(TYPES.IBadgeRepository).to(PostgreSQLBadgeRepository).inSingletonScope();
    container.bind(TYPES.IAchievementRepository).to(PostgreSQLAchievementRepository).inSingletonScope();

    // Import ServiceFactory to create services based on configuration
    const { ServiceFactory } = require('@/config/ServiceFactory');

    // Create services using the factory based on configuration
    const fileStorageService = ServiceFactory.createFileStorageService(config.storage);
    const aiService = ServiceFactory.createAIService(config.ai);
    const authService = ServiceFactory.createAuthService(config.auth);
    const mapsService = ServiceFactory.createMapsService(config.maps);
    const notificationService = ServiceFactory.createNotificationService(config.notification);

    // Bind services as constant values (already instantiated)
    container.bind(TYPES.IFileStorageService).toConstantValue(fileStorageService);
    container.bind(TYPES.IAIService).toConstantValue(aiService);
    container.bind(TYPES.IAuthenticationService).toConstantValue(authService);
    container.bind(TYPES.IMapsService).toConstantValue(mapsService);
    container.bind(TYPES.INotificationService).toConstantValue(notificationService);

    // Import and bind application services
    const { UserApplicationService } = require('@/application/services/UserApplicationService');
    const { ItemApplicationService } = require('@/application/services/ItemApplicationService');
    const { ExchangeApplicationService } = require('@/application/services/ExchangeApplicationService');
    const { MatchingApplicationService } = require('@/application/services/MatchingApplicationService');
    const { PointsApplicationService } = require('@/application/services/PointsApplicationService');

    container.bind(TYPES.IUserApplicationService).to(UserApplicationService).inSingletonScope();
    container.bind(TYPES.IItemApplicationService).to(ItemApplicationService).inSingletonScope();
    container.bind(TYPES.IExchangeApplicationService).to(ExchangeApplicationService).inSingletonScope();
    container.bind(TYPES.IMatchingApplicationService).to(MatchingApplicationService).inSingletonScope();
    container.bind(TYPES.IPointsApplicationService).to(PointsApplicationService).inSingletonScope();

    // Import and bind controllers
    const { ItemController } = require('@/api/controllers/item.controller');
    const { UserController } = require('@/api/controllers/user.controller');
    const { ExchangeController } = require('@/api/controllers/exchange.controller');
    const { MatchingController } = require('@/api/controllers/matching.controller');
    const { AuthController } = require('@/api/controllers/auth.controller');

    container.bind(TYPES.ItemController).to(ItemController).inSingletonScope();
    container.bind(TYPES.UserController).to(UserController).inSingletonScope();
    container.bind(TYPES.ExchangeController).to(ExchangeController).inSingletonScope();
    container.bind(TYPES.MatchingController).to(MatchingController).inSingletonScope();
    container.bind(TYPES.AuthController).to(AuthController).inSingletonScope();
  }

  static reset(): void {
    DIContainer.instance = new Container();
    DIContainer.configureContainer();
  }
}