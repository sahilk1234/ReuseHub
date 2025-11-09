import { AppConfig } from './AppConfig';

export class ConfigValidationError extends Error {
  constructor(
    message: string,
    public readonly missingFields: string[] = [],
    public readonly invalidFields: string[] = []
  ) {
    super(message);
    this.name = 'ConfigValidationError';
  }
}

export class ConfigValidator {
  /**
   * Validates the application configuration
   * @throws ConfigValidationError if validation fails
   */
  static validate(config: AppConfig): void {
    const missingFields: string[] = [];
    const invalidFields: string[] = [];

    // Validate basic app config
    if (!config.port || config.port < 1 || config.port > 65535) {
      invalidFields.push('PORT (must be between 1 and 65535)');
    }

    if (!config.nodeEnv) {
      missingFields.push('NODE_ENV');
    }

    // Validate database configuration
    this.validateDatabaseConfig(config, missingFields, invalidFields);

    // Validate storage configuration
    this.validateStorageConfig(config, missingFields, invalidFields);

    // Validate auth configuration
    this.validateAuthConfig(config, missingFields, invalidFields);

    // Validate AI configuration
    this.validateAIConfig(config, missingFields, invalidFields);

    // Validate maps configuration
    this.validateMapsConfig(config, missingFields, invalidFields);

    // Validate notification configuration
    this.validateNotificationConfig(config, missingFields, invalidFields);

    // Validate CORS configuration
    if (!config.cors.origin || config.cors.origin.length === 0) {
      missingFields.push('CORS_ORIGIN');
    }

    // Throw error if validation failed
    if (missingFields.length > 0 || invalidFields.length > 0) {
      const errorMessage = this.buildErrorMessage(missingFields, invalidFields);
      throw new ConfigValidationError(errorMessage, missingFields, invalidFields);
    }
  }

  private static validateDatabaseConfig(
    config: AppConfig,
    missingFields: string[],
    invalidFields: string[]
  ): void {
    if (!config.database.type) {
      missingFields.push('DATABASE_TYPE');
    }

    if (!config.database.connection) {
      missingFields.push('DATABASE_URL');
    }

    // For PostgreSQL and MySQL, validate connection details
    if (config.database.type === 'postgresql' || config.database.type === 'mysql') {
      if (!config.database.host) {
        missingFields.push('DATABASE_HOST');
      }
      if (!config.database.port) {
        missingFields.push('DATABASE_PORT');
      }
      if (!config.database.database) {
        missingFields.push('DATABASE_NAME');
      }
      if (!config.database.username) {
        missingFields.push('DATABASE_USERNAME');
      }
      if (!config.database.password) {
        missingFields.push('DATABASE_PASSWORD');
      }
    }
  }

  private static validateStorageConfig(
    config: AppConfig,
    missingFields: string[],
    invalidFields: string[]
  ): void {
    const { provider, config: storageConfig } = config.storage;

    switch (provider) {
      case 'aws-s3':
        if (!storageConfig.region) {
          missingFields.push('AWS_REGION');
        }
        if (!storageConfig.bucket) {
          missingFields.push('AWS_S3_BUCKET');
        }
        if (!storageConfig.accessKeyId) {
          missingFields.push('AWS_ACCESS_KEY_ID');
        }
        if (!storageConfig.secretAccessKey) {
          missingFields.push('AWS_SECRET_ACCESS_KEY');
        }
        break;

      case 'gcs':
        if (!storageConfig.projectId) {
          missingFields.push('GCP_PROJECT_ID');
        }
        if (!storageConfig.bucket) {
          missingFields.push('GCS_BUCKET');
        }
        if (!storageConfig.keyFilename) {
          missingFields.push('GCP_KEY_FILE');
        }
        break;

      case 'local':
        if (!storageConfig.uploadPath) {
          missingFields.push('LOCAL_UPLOAD_PATH');
        }
        if (!storageConfig.baseUrl) {
          missingFields.push('LOCAL_BASE_URL');
        }
        break;

      default:
        invalidFields.push(`STORAGE_PROVIDER (unsupported provider: ${provider})`);
    }
  }

  private static validateAuthConfig(
    config: AppConfig,
    missingFields: string[],
    invalidFields: string[]
  ): void {
    const { provider, config: authConfig } = config.auth;

    switch (provider) {
      case 'auth0':
        if (!authConfig.domain) {
          missingFields.push('AUTH0_DOMAIN');
        }
        if (!authConfig.clientId) {
          missingFields.push('AUTH0_CLIENT_ID');
        }
        if (!authConfig.clientSecret) {
          missingFields.push('AUTH0_CLIENT_SECRET');
        }
        if (!authConfig.audience) {
          missingFields.push('AUTH0_AUDIENCE');
        }
        break;

      case 'okta':
        if (!authConfig.domain) {
          missingFields.push('OKTA_DOMAIN');
        }
        if (!authConfig.clientId) {
          missingFields.push('OKTA_CLIENT_ID');
        }
        if (!authConfig.clientSecret) {
          missingFields.push('OKTA_CLIENT_SECRET');
        }
        break;

      case 'firebase':
        if (!authConfig.projectId) {
          missingFields.push('FIREBASE_PROJECT_ID');
        }
        if (!authConfig.privateKey) {
          missingFields.push('FIREBASE_PRIVATE_KEY');
        }
        if (!authConfig.clientEmail) {
          missingFields.push('FIREBASE_CLIENT_EMAIL');
        }
        break;

      case 'custom':
        if (!authConfig.jwtSecret) {
          missingFields.push('JWT_SECRET');
        }
        if (config.nodeEnv === 'production' && authConfig.jwtSecret === 'your-secret-key') {
          invalidFields.push('JWT_SECRET (must be changed in production)');
        }
        break;

      default:
        invalidFields.push(`AUTH_PROVIDER (unsupported provider: ${provider})`);
    }
  }

  private static validateAIConfig(
    config: AppConfig,
    missingFields: string[],
    invalidFields: string[]
  ): void {
    const { provider, config: aiConfig } = config.ai;

    switch (provider) {
      case 'openai':
        if (!aiConfig.apiKey) {
          missingFields.push('OPENAI_API_KEY');
        }
        break;

      case 'google':
        if (!aiConfig.apiKey) {
          missingFields.push('GOOGLE_AI_API_KEY');
        }
        break;

      case 'azure':
        if (!aiConfig.endpoint) {
          missingFields.push('AZURE_AI_ENDPOINT');
        }
        if (!aiConfig.apiKey) {
          missingFields.push('AZURE_AI_API_KEY');
        }
        break;

      default:
        invalidFields.push(`AI_PROVIDER (unsupported provider: ${provider})`);
    }
  }

  private static validateMapsConfig(
    config: AppConfig,
    missingFields: string[],
    invalidFields: string[]
  ): void {
    const { provider, config: mapsConfig } = config.maps;

    switch (provider) {
      case 'google':
        if (!mapsConfig.apiKey) {
          missingFields.push('GOOGLE_MAPS_API_KEY');
        }
        break;

      case 'mapbox':
        if (!mapsConfig.accessToken) {
          missingFields.push('MAPBOX_ACCESS_TOKEN');
        }
        break;

      case 'osm':
        // OSM doesn't require API keys, but validate base URL if provided
        if (mapsConfig.baseUrl && !this.isValidUrl(mapsConfig.baseUrl)) {
          invalidFields.push('OSM_BASE_URL (must be a valid URL)');
        }
        break;

      default:
        invalidFields.push(`MAPS_PROVIDER (unsupported provider: ${provider})`);
    }
  }

  private static validateNotificationConfig(
    config: AppConfig,
    missingFields: string[],
    invalidFields: string[]
  ): void {
    const { provider, config: notificationConfig } = config.notification;

    switch (provider) {
      case 'sendgrid':
        if (!notificationConfig.apiKey) {
          missingFields.push('SENDGRID_API_KEY');
        }
        if (!notificationConfig.fromEmail) {
          missingFields.push('SENDGRID_FROM_EMAIL');
        }
        break;

      case 'ses':
        if (!notificationConfig.region) {
          missingFields.push('AWS_SES_REGION');
        }
        if (!notificationConfig.accessKeyId) {
          missingFields.push('AWS_ACCESS_KEY_ID');
        }
        if (!notificationConfig.secretAccessKey) {
          missingFields.push('AWS_SECRET_ACCESS_KEY');
        }
        if (!notificationConfig.fromEmail) {
          missingFields.push('SES_FROM_EMAIL');
        }
        break;

      case 'mailgun':
        if (!notificationConfig.apiKey) {
          missingFields.push('MAILGUN_API_KEY');
        }
        if (!notificationConfig.domain) {
          missingFields.push('MAILGUN_DOMAIN');
        }
        if (!notificationConfig.fromEmail) {
          missingFields.push('MAILGUN_FROM_EMAIL');
        }
        break;

      default:
        invalidFields.push(`NOTIFICATION_PROVIDER (unsupported provider: ${provider})`);
    }
  }

  private static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  private static buildErrorMessage(missingFields: string[], invalidFields: string[]): string {
    const messages: string[] = ['Configuration validation failed:'];

    if (missingFields.length > 0) {
      messages.push('\nMissing required fields:');
      missingFields.forEach((field) => messages.push(`  - ${field}`));
    }

    if (invalidFields.length > 0) {
      messages.push('\nInvalid field values:');
      invalidFields.forEach((field) => messages.push(`  - ${field}`));
    }

    messages.push('\nPlease check your .env file or environment variables.');

    return messages.join('\n');
  }
}
