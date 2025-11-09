# Configuration Management Guide

## Overview

Re:UseNet implements a robust configuration management system that supports:
- Environment-based configuration
- Configuration validation
- Service factory pattern for provider switching
- Easy deployment across different environments

## What Was Implemented

### 1. Configuration Validation (`src/config/ConfigValidator.ts`)

A comprehensive validation system that:
- Validates all required configuration fields
- Checks provider-specific requirements
- Ensures production-ready security settings
- Provides detailed error messages with missing/invalid fields

**Key Features:**
- Validates database configuration
- Validates storage provider settings (local, AWS S3, GCS)
- Validates authentication settings (custom JWT, Auth0, Okta, Firebase)
- Validates AI service configuration (OpenAI, Google, Azure)
- Validates maps service configuration (Google Maps, Mapbox, OSM)
- Validates notification service configuration (SendGrid, SES, Mailgun)
- Checks for insecure defaults in production

### 2. Service Factory (`src/config/ServiceFactory.ts`)

Implements the Strategy pattern for creating service instances:
- Creates file storage services based on provider
- Creates AI services based on provider
- Creates maps services based on provider
- Creates notification services based on provider
- Provides `createAllServices()` for bulk service creation

**Benefits:**
- Switch providers by changing environment variables
- No code changes required to swap providers
- Consistent interface across all providers
- Easy to add new providers

### 3. Enhanced Configuration Loader (`src/config/ConfigLoader.ts`)

Updated to include:
- Automatic validation on load
- Optional validation bypass for testing
- Comprehensive error handling
- Support for all service providers

### 4. Docker Deployment Configuration

#### Production Docker Compose (`docker-compose.prod.yml`)
- Multi-stage build optimization
- Health checks for all services
- Resource limits and reservations
- Log rotation configuration
- Non-root user for security
- Automatic restart policies
- Service dependencies with health conditions

#### Environment Templates
- `.env.example` - Development template with documentation
- `.env.production.example` - Production template with security checklist

#### Deployment Scripts
- `scripts/deploy.sh` - Linux/Mac deployment automation
- `scripts/deploy.ps1` - Windows PowerShell deployment automation

**Script Features:**
- Deploy development or production environments
- Stop environments
- View logs
- Backup databases
- Health checks
- Prerequisites validation
- Configuration validation

### 5. Documentation

#### Deployment Guide (`docs/DEPLOYMENT.md`)
Comprehensive guide covering:
- Quick start for development and production
- Environment variable configuration
- Docker architecture explanation
- Cloud deployment scenarios (AWS, GCP, Azure)
- Database management
- Monitoring and logging
- Scaling strategies
- Security best practices
- Troubleshooting guide
- Maintenance procedures

#### Configuration README (`src/config/README.md`)
Detailed documentation for:
- Configuration system usage
- Environment variables reference
- Provider switching guide
- Error handling
- Best practices
- Adding new providers

#### Updated Main README
- Added deployment section
- Added deployment script commands
- Linked to comprehensive deployment guide

## How to Use

### Development

1. Copy environment template:
```bash
cp .env.example .env
```

2. Configure required services (AI, Maps, Notifications)

3. Deploy:
```bash
./scripts/deploy.sh dev
```

### Production

1. Copy production template:
```bash
cp .env.production.example .env.production
```

2. Configure all production values:
   - Strong JWT secret
   - Production database credentials
   - AWS S3 or GCS for storage
   - Production API keys
   - Production domains for CORS

3. Deploy:
```bash
./scripts/deploy.sh prod
```

### Switching Providers

To switch from local storage to AWS S3:

```bash
# Change in .env
STORAGE_PROVIDER=aws-s3
AWS_REGION=us-east-1
AWS_S3_BUCKET=my-bucket
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
```

Restart the application - no code changes needed!

## Configuration Validation

The system validates configuration on startup. If validation fails, you'll see:

```
Configuration validation failed:

Missing required fields:
  - OPENAI_API_KEY
  - GOOGLE_MAPS_API_KEY

Invalid field values:
  - JWT_SECRET (must be changed in production)

Please check your .env file or environment variables.
```

## Security Features

1. **Production Validation**: Ensures secure defaults aren't used in production
2. **Required Fields**: Validates all required configuration is present
3. **Provider-Specific Validation**: Checks provider-specific requirements
4. **Non-Root User**: Docker containers run as non-root user
5. **Health Checks**: Automatic health monitoring
6. **Resource Limits**: Prevents resource exhaustion
7. **Log Rotation**: Prevents disk space issues

## Provider Support Status

### Currently Implemented
- ✅ Local file storage
- ✅ AWS S3 storage
- ✅ Custom JWT authentication
- ✅ OpenAI AI service
- ✅ Google AI service (Gemini)
- ✅ Google Maps service
- ✅ SendGrid notifications

### Planned (Interfaces Ready)
- ⏳ Google Cloud Storage
- ⏳ Auth0 authentication
- ⏳ Okta authentication
- ⏳ Firebase authentication
- ⏳ Azure AI service
- ⏳ Mapbox maps service
- ⏳ OpenStreetMap service
- ⏳ AWS SES notifications
- ⏳ Mailgun notifications

## Troubleshooting

### Configuration Validation Errors

If you see validation errors:
1. Check the error message for missing fields
2. Verify environment variables are set correctly
3. Ensure no placeholder values remain (CHANGE_ME, YOUR_)
4. Check provider-specific requirements

### Service Creation Errors

If services fail to create:
1. Verify the provider is supported
2. Check provider-specific configuration
3. Ensure API keys are valid
4. Review logs for detailed error messages

### Deployment Issues

If deployment fails:
1. Check Docker and Docker Compose are installed
2. Verify .env file exists and is configured
3. Check logs: `./scripts/deploy.sh logs <env>`
4. Verify health: `./scripts/deploy.sh health <env>`

## Best Practices

1. **Never commit .env files** - Use .env.example as template
2. **Use strong secrets in production** - Generate with `openssl rand -base64 32`
3. **Validate configuration** - Don't disable validation in production
4. **Use cloud storage in production** - Don't use local storage
5. **Configure CORS properly** - Only allow trusted domains
6. **Set up monitoring** - Use health checks and log aggregation
7. **Regular backups** - Use deployment script backup command
8. **Review security checklist** - See .env.production.example

## Next Steps

To add a new provider:
1. Implement the service interface
2. Add provider type to AppConfig
3. Add configuration loading in ConfigLoader
4. Add validation in ConfigValidator
5. Add factory logic in ServiceFactory
6. Update .env.example
7. Update documentation

See `src/config/README.md` for detailed instructions.
