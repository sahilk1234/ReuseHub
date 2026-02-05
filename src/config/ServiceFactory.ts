import { AppConfig, StorageConfig, AuthConfig, AIConfig, MapsConfig, NotificationConfig } from './AppConfig';
import { IFileStorageService } from '../infrastructure/services/IFileStorageService';
import { IAuthenticationService } from '../infrastructure/services/IAuthenticationService';
import { IAIService } from '../infrastructure/services/IAIService';
import { IMapsService } from '../infrastructure/services/IMapsService';
import { INotificationService } from '../infrastructure/services/INotificationService';

// Import adapters
import { S3FileStorageService } from '../infrastructure/services/adapters/S3FileStorageService';
import { LocalFileStorageService } from '../infrastructure/services/adapters/LocalFileStorageService';
import { JWTAuthenticationService } from '../infrastructure/services/adapters/JWTAuthenticationService';
import { Auth0AuthenticationService } from '../infrastructure/services/adapters/Auth0AuthenticationService';
import { OpenAIService } from '../infrastructure/services/adapters/OpenAIService';
import { GoogleAIService } from '../infrastructure/services/adapters/GoogleAIService';
import { GoogleMapsService } from '../infrastructure/services/adapters/GoogleMapsService';
import { SendGridNotificationService } from '../infrastructure/services/adapters/SendGridNotificationService';

/**
 * Factory class for creating service instances based on configuration
 * Implements the Strategy pattern for easy provider switching
 */
export class ServiceFactory {
  /**
   * Creates a file storage service based on the storage configuration
   */
  static createFileStorageService(config: StorageConfig): IFileStorageService {
    switch (config.provider) {
      case 'aws-s3':
        return new S3FileStorageService({
          region: config.config.region,
          bucketName: config.config.bucket,
          accessKeyId: config.config.accessKeyId,
          secretAccessKey: config.config.secretAccessKey,
        });

      case 'gcs':
        // GCS adapter would be implemented here
        throw new Error('Google Cloud Storage adapter not yet implemented. Use aws-s3 or local provider.');

      case 'local':
        return new LocalFileStorageService({
          uploadDirectory: config.config.uploadPath,
          baseUrl: config.config.baseUrl,
        });

      default:
        throw new Error(`Unsupported storage provider: ${config.provider}`);
    }
  }

  /**
   * Creates an authentication service based on the auth configuration
   */
  static createAuthService(config: AuthConfig): IAuthenticationService {
    switch (config.provider) {
      case 'auth0':
        return new Auth0AuthenticationService({
          domain: config.config.domain,
          clientId: config.config.clientId,
          clientSecret: config.config.clientSecret,
          audience: config.config.audience
        });

      case 'okta':
        // Okta adapter would be implemented here
        throw new Error('Okta adapter not yet implemented. Use custom provider.');

      case 'firebase':
        // Firebase adapter would be implemented here
        throw new Error('Firebase adapter not yet implemented. Use custom provider.');

      case 'custom':
        // Custom JWT authentication
        return new JWTAuthenticationService({
          jwtSecret: config.config.jwtSecret,
          jwtExpiresIn: config.config.jwtExpiresIn,
          refreshTokenExpiresIn: config.config.refreshTokenExpiresIn || '7d',
          jwtIssuer: config.config.jwtIssuer,
          jwtAudience: config.config.jwtAudience,
          clockToleranceSec: config.config.clockToleranceSec
        });

      default:
        throw new Error(`Unsupported auth provider: ${config.provider}`);
    }
  }

  /**
   * Creates an AI service based on the AI configuration
   */
  static createAIService(config: AIConfig): IAIService {
    switch (config.provider) {
      case 'openai':
        return new OpenAIService({
          apiKey: config.config.apiKey,
          model: config.config.model,
          visionModel: config.config.visionModel,
          maxTokens: config.config.maxTokens,
        });

      case 'google':
        return new GoogleAIService({
          apiKey: config.config.apiKey,
          model: config.config.model,
          visionModel: config.config.visionModel,
          maxTokens: config.config.maxTokens,
        });

      case 'azure':
        // Azure AI adapter would be implemented here
        throw new Error('Azure AI adapter not yet implemented. Use openai or google provider.');

      default:
        throw new Error(`Unsupported AI provider: ${config.provider}`);
    }
  }

  /**
   * Creates a maps service based on the maps configuration
   */
  static createMapsService(config: MapsConfig): IMapsService {
    switch (config.provider) {
      case 'google':
        return new GoogleMapsService(config.config.apiKey);

      case 'mapbox':
        // Mapbox adapter would be implemented here
        throw new Error('Mapbox adapter not yet implemented. Use google provider.');

      case 'osm':
        // OpenStreetMap adapter would be implemented here
        throw new Error('OpenStreetMap adapter not yet implemented. Use google provider.');

      default:
        throw new Error(`Unsupported maps provider: ${config.provider}`);
    }
  }

  /**
   * Creates a notification service based on the notification configuration
   */
  static createNotificationService(config: NotificationConfig): INotificationService {
    switch (config.provider) {
      case 'sendgrid':
        return new SendGridNotificationService({
          apiKey: config.config.apiKey,
          fromEmail: config.config.fromEmail,
        });

      case 'ses':
        // AWS SES adapter would be implemented here
        throw new Error('AWS SES adapter not yet implemented. Use sendgrid provider.');

      case 'mailgun':
        // Mailgun adapter would be implemented here
        throw new Error('Mailgun adapter not yet implemented. Use sendgrid provider.');

      default:
        throw new Error(`Unsupported notification provider: ${config.provider}`);
    }
  }

  /**
   * Creates all services from the application configuration
   */
  static createAllServices(config: AppConfig): {
    fileStorageService: IFileStorageService;
    authService: IAuthenticationService;
    aiService: IAIService;
    mapsService: IMapsService;
    notificationService: INotificationService;
  } {
    return {
      fileStorageService: this.createFileStorageService(config.storage),
      authService: this.createAuthService(config.auth),
      aiService: this.createAIService(config.ai),
      mapsService: this.createMapsService(config.maps),
      notificationService: this.createNotificationService(config.notification),
    };
  }
}
