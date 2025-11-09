export const TYPES = {
  // Configuration
  AppConfig: Symbol.for('AppConfig'),
  
  // Database
  DatabaseConnection: Symbol.for('DatabaseConnection'),
  
  // Repositories
  IItemRepository: Symbol.for('IItemRepository'),
  IUserRepository: Symbol.for('IUserRepository'),
  IExchangeRepository: Symbol.for('IExchangeRepository'),
  IBadgeRepository: Symbol.for('IBadgeRepository'),
  IAchievementRepository: Symbol.for('IAchievementRepository'),
  
  // Infrastructure Services
  IFileStorageService: Symbol.for('IFileStorageService'),
  IAIService: Symbol.for('IAIService'),
  IAuthenticationService: Symbol.for('IAuthenticationService'),
  IMapsService: Symbol.for('IMapsService'),
  INotificationService: Symbol.for('INotificationService'),
  
  // Application Services
  IItemApplicationService: Symbol.for('IItemApplicationService'),
  IUserApplicationService: Symbol.for('IUserApplicationService'),
  IExchangeApplicationService: Symbol.for('IExchangeApplicationService'),
  IMatchingApplicationService: Symbol.for('IMatchingApplicationService'),
  IPointsApplicationService: Symbol.for('IPointsApplicationService'),
  
  // Controllers
  ItemController: Symbol.for('ItemController'),
  UserController: Symbol.for('UserController'),
  ExchangeController: Symbol.for('ExchangeController'),
  MatchingController: Symbol.for('MatchingController'),
  PointsController: Symbol.for('PointsController'),
  AuthController: Symbol.for('AuthController'),
};