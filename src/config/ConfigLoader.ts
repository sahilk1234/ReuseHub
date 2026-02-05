import { AppConfig, DatabaseConfig, StorageConfig, AuthConfig, AIConfig, MapsConfig, NotificationConfig } from './AppConfig';
import { ConfigValidator } from './ConfigValidator';
import * as dotenv from 'dotenv';

export class ConfigLoader {
  /**
   * Loads and validates application configuration from environment variables
   * @param validate - Whether to validate the configuration (default: true)
   * @throws ConfigValidationError if validation fails
   */
  static load(validate: boolean = true): AppConfig {
    dotenv.config();

    const config: AppConfig = {
      port: parseInt(process.env.PORT || '3000', 10),
      nodeEnv: process.env.NODE_ENV || 'development',
      database: this.loadDatabaseConfig(),
      storage: this.loadStorageConfig(),
      auth: this.loadAuthConfig(),
      ai: this.loadAIConfig(),
      maps: this.loadMapsConfig(),
      notification: this.loadNotificationConfig(),
      cors: {
        origin: process.env.CORS_ORIGIN?.split(',').map(o => o.trim()) || ['http://localhost:3000'],
        credentials: process.env.CORS_CREDENTIALS === 'true',
      },
      rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
        max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
      },
    };

    // Validate configuration if requested
    if (validate) {
      ConfigValidator.validate(config);
    }

    return config;
  }

  private static loadDatabaseConfig(): DatabaseConfig {
    const type = (process.env.DATABASE_TYPE as any) || 'postgresql';
    
    return {
      type,
      connection: process.env.DATABASE_URL || 'postgresql://localhost:5432/reusenet',
      host: process.env.DATABASE_HOST || 'localhost',
      port: parseInt(process.env.DATABASE_PORT || '5432', 10),
      database: process.env.DATABASE_NAME || 'reusenet',
      username: process.env.DATABASE_USERNAME || 'postgres',
      password: process.env.DATABASE_PASSWORD || 'password',
    };
  }

  private static loadStorageConfig(): StorageConfig {
    const provider = (process.env.STORAGE_PROVIDER as any) || 'local';
    
    switch (provider) {
      case 'aws-s3':
        return {
          provider,
          config: {
            region: process.env.AWS_REGION || 'us-east-1',
            bucket: process.env.AWS_S3_BUCKET || 'reusenet-files',
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          },
        };
      case 'gcs':
        return {
          provider,
          config: {
            projectId: process.env.GCP_PROJECT_ID,
            bucket: process.env.GCS_BUCKET || 'reusenet-files',
            keyFilename: process.env.GCP_KEY_FILE,
          },
        };
      default:
        return {
          provider: 'local',
          config: {
            uploadPath: process.env.LOCAL_UPLOAD_PATH || './uploads',
            baseUrl: process.env.LOCAL_BASE_URL || 'http://localhost:3000',
          },
        };
    }
  }

  private static loadAuthConfig(): AuthConfig {
    const provider = (process.env.AUTH_PROVIDER as any) || 'custom';
    
    switch (provider) {
      case 'auth0':
        return {
          provider,
          config: {
            domain: process.env.AUTH0_DOMAIN,
            clientId: process.env.AUTH0_CLIENT_ID,
            clientSecret: process.env.AUTH0_CLIENT_SECRET,
            audience: process.env.AUTH0_AUDIENCE,
          },
        };
      case 'okta':
        return {
          provider,
          config: {
            domain: process.env.OKTA_DOMAIN,
            clientId: process.env.OKTA_CLIENT_ID,
            clientSecret: process.env.OKTA_CLIENT_SECRET,
          },
        };
      case 'firebase':
        return {
          provider,
          config: {
            projectId: process.env.FIREBASE_PROJECT_ID,
            privateKey: process.env.FIREBASE_PRIVATE_KEY,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          },
        };
      default:
        const jwtAudienceRaw = process.env.JWT_AUDIENCE;
        const jwtAudienceList = jwtAudienceRaw
          ? jwtAudienceRaw.split(',').map(a => a.trim()).filter(a => a.length > 0)
          : undefined;
        const jwtAudience = jwtAudienceList && jwtAudienceList.length > 0
          ? (jwtAudienceList.length === 1 ? jwtAudienceList[0] : jwtAudienceList)
          : undefined;
        const jwtClockToleranceSec = process.env.JWT_CLOCK_TOLERANCE_SEC
          ? parseInt(process.env.JWT_CLOCK_TOLERANCE_SEC, 10)
          : undefined;

        return {
          provider: 'custom',
          config: {
            jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
            jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
            refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
            jwtIssuer: process.env.JWT_ISSUER,
            jwtAudience,
            clockToleranceSec: jwtClockToleranceSec,
          },
        };
    }
  }

  private static loadAIConfig(): AIConfig {
    const provider = (process.env.AI_PROVIDER as any) || 'openai';
    
    switch (provider) {
      case 'openai':
        return {
          provider,
          config: {
            apiKey: process.env.OPENAI_API_KEY,
            model: process.env.OPENAI_MODEL || 'gpt-4-vision-preview',
            maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '1000', 10),
          },
        };
      case 'google':
        return {
          provider,
          config: {
            apiKey: process.env.GOOGLE_AI_API_KEY,
            model: process.env.GOOGLE_AI_MODEL || 'gemini-1.5-flash',
            visionModel: process.env.GOOGLE_AI_VISION_MODEL || 'gemini-1.5-flash',
            maxTokens: parseInt(process.env.GOOGLE_AI_MAX_TOKENS || '1000', 10),
          },
        };
      case 'azure':
        return {
          provider,
          config: {
            endpoint: process.env.AZURE_AI_ENDPOINT,
            apiKey: process.env.AZURE_AI_API_KEY,
          },
        };
      default:
        return {
          provider: 'openai',
          config: {
            apiKey: process.env.OPENAI_API_KEY,
            model: 'gpt-4-vision-preview',
            maxTokens: 1000,
          },
        };
    }
  }

  private static loadMapsConfig(): MapsConfig {
    const provider = (process.env.MAPS_PROVIDER as any) || 'google';
    
    switch (provider) {
      case 'google':
        return {
          provider,
          config: {
            apiKey: process.env.GOOGLE_MAPS_API_KEY,
          },
        };
      case 'mapbox':
        return {
          provider,
          config: {
            accessToken: process.env.MAPBOX_ACCESS_TOKEN,
          },
        };
      case 'osm':
        return {
          provider,
          config: {
            baseUrl: process.env.OSM_BASE_URL || 'https://nominatim.openstreetmap.org',
          },
        };
      default:
        return {
          provider: 'google',
          config: {
            apiKey: process.env.GOOGLE_MAPS_API_KEY,
          },
        };
    }
  }

  private static loadNotificationConfig(): NotificationConfig {
    const provider = (process.env.NOTIFICATION_PROVIDER as any) || 'sendgrid';
    
    switch (provider) {
      case 'sendgrid':
        return {
          provider,
          config: {
            apiKey: process.env.SENDGRID_API_KEY,
            fromEmail: process.env.SENDGRID_FROM_EMAIL || 'noreply@reusenet.com',
          },
        };
      case 'ses':
        return {
          provider,
          config: {
            region: process.env.AWS_SES_REGION || 'us-east-1',
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            fromEmail: process.env.SES_FROM_EMAIL || 'noreply@reusenet.com',
          },
        };
      case 'mailgun':
        return {
          provider,
          config: {
            apiKey: process.env.MAILGUN_API_KEY,
            domain: process.env.MAILGUN_DOMAIN,
            fromEmail: process.env.MAILGUN_FROM_EMAIL || 'noreply@reusenet.com',
          },
        };
      default:
        return {
          provider: 'sendgrid',
          config: {
            apiKey: process.env.SENDGRID_API_KEY,
            fromEmail: 'noreply@reusenet.com',
          },
        };
    }
  }
}
