# Configuration Management System

This directory contains the configuration management system for Re:UseNet, implementing environment-based configuration with validation and service factory pattern for easy provider switching.

## Overview

The configuration system consists of:

- **AppConfig**: TypeScript interfaces defining the configuration structure
- **ConfigLoader**: Loads configuration from environment variables
- **ConfigValidator**: Validates required configuration values
- **ServiceFactory**: Creates service instances based on configuration (Strategy pattern)

## Usage

### Loading Configuration

```typescript
import { ConfigLoader } from './config';

// Load and validate configuration
const config = ConfigLoader.load();

// Load without validation (not recommended)
const config = ConfigLoader.load(false);
```

### Creating Services

```typescript
import { ServiceFactory } from './config';

// Create individual services
const fileStorageService = ServiceFactory.createFileStorageService(config.storage);
const aiService = ServiceFactory.createAIService(config.ai);
const mapsService = ServiceFactory.createMapsService(config.maps);
const notificationService = ServiceFactory.createNotificationService(config.notification);

// Or create all services at once
const services = ServiceFactory.createAllServices(config);
```

### Configuration Validation

The `ConfigValidator` automatically validates configuration when `ConfigLoader.load()` is called. It checks:

- Required fields are present
- Field values are valid (e.g., port numbers, URLs)
- Provider-specific configuration is complete
- Production-specific requirements (e.g., secure JWT secrets)

If validation fails, a `ConfigValidationError` is thrown with details about missing or invalid fields.

## Environment Variables

All configuration is loaded from environment variables. See `.env.example` for a complete list of available variables.

### Core Configuration

- `NODE_ENV`: Application environment (development, production, test)
- `PORT`: Server port (default: 3000)

### Database Configuration

- `DATABASE_TYPE`: Database type (postgresql, mysql, firestore)
- `DATABASE_URL`: Full database connection string
- `DATABASE_HOST`: Database host
- `DATABASE_PORT`: Database port
- `DATABASE_NAME`: Database name
- `DATABASE_USERNAME`: Database username
- `DATABASE_PASSWORD`: Database password

### Storage Configuration

Choose a storage provider and configure accordingly:

#### Local Storage
- `STORAGE_PROVIDER=local`
- `LOCAL_UPLOAD_PATH`: Path to store uploaded files
- `LOCAL_BASE_URL`: Base URL for file access

#### AWS S3
- `STORAGE_PROVIDER=aws-s3`
- `AWS_REGION`: AWS region
- `AWS_S3_BUCKET`: S3 bucket name
- `AWS_ACCESS_KEY_ID`: AWS access key
- `AWS_SECRET_ACCESS_KEY`: AWS secret key

#### Google Cloud Storage
- `STORAGE_PROVIDER=gcs`
- `GCP_PROJECT_ID`: GCP project ID
- `GCS_BUCKET`: GCS bucket name
- `GCP_KEY_FILE`: Path to service account key file

### Authentication Configuration

Choose an auth provider and configure accordingly:

#### Custom JWT (Default)
- `AUTH_PROVIDER=custom`
- `JWT_SECRET`: Secret key for JWT signing
- `JWT_EXPIRES_IN`: Access token expiration (e.g., 24h)
- `REFRESH_TOKEN_EXPIRES_IN`: Refresh token expiration (e.g., 7d)
- `JWT_ISSUER`: Optional token issuer (e.g., https://yourdomain.com/)
- `JWT_AUDIENCE`: Optional token audience (comma-separated for multiple values)
- `JWT_CLOCK_TOLERANCE_SEC`: Optional clock skew tolerance in seconds

#### Auth0
- `AUTH_PROVIDER=auth0`
- `AUTH0_DOMAIN`: Auth0 domain
- `AUTH0_CLIENT_ID`: Auth0 client ID
- `AUTH0_CLIENT_SECRET`: Auth0 client secret
- `AUTH0_AUDIENCE`: Auth0 API audience

#### Okta
- `AUTH_PROVIDER=okta`
- `OKTA_DOMAIN`: Okta domain
- `OKTA_CLIENT_ID`: Okta client ID
- `OKTA_CLIENT_SECRET`: Okta client secret

#### Firebase
- `AUTH_PROVIDER=firebase`
- `FIREBASE_PROJECT_ID`: Firebase project ID
- `FIREBASE_PRIVATE_KEY`: Firebase private key
- `FIREBASE_CLIENT_EMAIL`: Firebase client email

### AI Configuration

Choose an AI provider and configure accordingly:

#### OpenAI (Default)
- `AI_PROVIDER=openai`
- `OPENAI_API_KEY`: OpenAI API key
- `OPENAI_MODEL`: Model to use (default: gpt-4-vision-preview)
- `OPENAI_MAX_TOKENS`: Max tokens per request (default: 1000)

#### Google AI (Gemini)
- `AI_PROVIDER=google`
- `GOOGLE_AI_API_KEY`: Google AI API key (get from https://makersuite.google.com/app/apikey)
- `GOOGLE_AI_MODEL`: Model to use (default: gemini-1.5-flash - cheapest option)
- `GOOGLE_AI_VISION_MODEL`: Vision model to use (default: gemini-1.5-flash)
- `GOOGLE_AI_MAX_TOKENS`: Max tokens per request (default: 1000)

#### Azure AI
- `AI_PROVIDER=azure`
- `AZURE_AI_ENDPOINT`: Azure AI endpoint
- `AZURE_AI_API_KEY`: Azure AI API key

### Maps Configuration

Choose a maps provider and configure accordingly:

#### Google Maps (Default)
- `MAPS_PROVIDER=google`
- `GOOGLE_MAPS_API_KEY`: Google Maps API key

#### Mapbox
- `MAPS_PROVIDER=mapbox`
- `MAPBOX_ACCESS_TOKEN`: Mapbox access token

#### OpenStreetMap
- `MAPS_PROVIDER=osm`
- `OSM_BASE_URL`: OSM Nominatim base URL (optional)

### Notification Configuration

Choose a notification provider and configure accordingly:

#### SendGrid (Default)
- `NOTIFICATION_PROVIDER=sendgrid`
- `SENDGRID_API_KEY`: SendGrid API key
- `SENDGRID_FROM_EMAIL`: From email address

#### AWS SES
- `NOTIFICATION_PROVIDER=ses`
- `AWS_SES_REGION`: AWS SES region
- `AWS_ACCESS_KEY_ID`: AWS access key
- `AWS_SECRET_ACCESS_KEY`: AWS secret key
- `SES_FROM_EMAIL`: From email address

#### Mailgun
- `NOTIFICATION_PROVIDER=mailgun`
- `MAILGUN_API_KEY`: Mailgun API key
- `MAILGUN_DOMAIN`: Mailgun domain
- `MAILGUN_FROM_EMAIL`: From email address

### CORS Configuration

- `CORS_ORIGIN`: Comma-separated list of allowed origins
- `CORS_CREDENTIALS`: Enable credentials (true/false)

### Rate Limiting Configuration

- `RATE_LIMIT_WINDOW_MS`: Time window in milliseconds (default: 900000 = 15 minutes)
- `RATE_LIMIT_MAX`: Maximum requests per window (default: 100)

## Switching Providers

To switch providers, simply change the provider environment variable and configure the required settings:

### Example: Switching from Local to AWS S3 Storage

```bash
# Before (local storage)
STORAGE_PROVIDER=local
LOCAL_UPLOAD_PATH=./uploads
LOCAL_BASE_URL=http://localhost:3000

# After (AWS S3)
STORAGE_PROVIDER=aws-s3
AWS_REGION=us-east-1
AWS_S3_BUCKET=my-reusenet-bucket
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
```

No code changes required! The ServiceFactory automatically creates the appropriate service implementation.

## Error Handling

### ConfigValidationError

Thrown when configuration validation fails. Contains:
- `message`: Human-readable error message
- `missingFields`: Array of missing required fields
- `invalidFields`: Array of invalid field values

Example:
```typescript
try {
  const config = ConfigLoader.load();
} catch (error) {
  if (error instanceof ConfigValidationError) {
    console.error('Configuration validation failed:');
    console.error('Missing fields:', error.missingFields);
    console.error('Invalid fields:', error.invalidFields);
  }
}
```

## Best Practices

1. **Always validate in production**: Never disable validation in production environments
2. **Use strong secrets**: Change default JWT secrets and use strong, random values
3. **Environment-specific configs**: Use different `.env` files for different environments
4. **Secure sensitive data**: Never commit `.env` files to version control
5. **Document custom providers**: If adding new providers, update this README

## Adding New Providers

To add a new provider (e.g., a new storage service):

1. Create the adapter class implementing the service interface
2. Add the provider type to the config interface in `AppConfig.ts`
3. Add configuration loading logic in `ConfigLoader.ts`
4. Add validation logic in `ConfigValidator.ts`
5. Add factory logic in `ServiceFactory.ts`
6. Update `.env.example` with new environment variables
7. Update this README with configuration instructions
