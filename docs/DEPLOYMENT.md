# Re:UseNet Deployment Guide

This guide covers deploying Re:UseNet using Docker and docker-compose for both development and production environments.

## Prerequisites

- Docker 20.10 or higher
- Docker Compose 2.0 or higher
- At least 2GB of available RAM
- At least 10GB of available disk space

## Quick Start

### Development Environment

1. Clone the repository:
```bash
git clone <repository-url>
cd reuse-net
```

2. Copy the environment template:
```bash
cp .env.example .env
```

3. Edit `.env` and configure required services (at minimum, set API keys for AI and Maps services)

4. Start the development environment:
```bash
docker-compose -f docker-compose.dev.yml up
```

The application will be available at `http://localhost:3000`

### Production Environment

1. Copy the environment template:
```bash
cp .env.example .env.production
```

2. Edit `.env.production` with production values:
   - Set `NODE_ENV=production`
   - Use strong, random values for `JWT_SECRET`
   - Configure production database credentials
   - Set up production storage (AWS S3 recommended)
   - Configure production API keys

3. Start the production environment:
```bash
docker-compose --env-file .env.production up -d
```

## Environment Configuration

### Required Environment Variables

The following environment variables MUST be configured for the application to start:

#### Core Configuration
- `NODE_ENV`: Environment (development, production, test)
- `PORT`: Server port (default: 3000)

#### Database Configuration
- `DATABASE_TYPE`: postgresql (required)
- `DATABASE_URL`: Full connection string
- `DATABASE_HOST`: Database host
- `DATABASE_PORT`: Database port
- `DATABASE_NAME`: Database name
- `DATABASE_USERNAME`: Database username
- `DATABASE_PASSWORD`: Database password

#### AI Service (Required for item categorization)
- `AI_PROVIDER`: openai (currently only OpenAI is supported)
- `OPENAI_API_KEY`: Your OpenAI API key

#### Maps Service (Required for location features)
- `MAPS_PROVIDER`: google (currently only Google Maps is supported)
- `GOOGLE_MAPS_API_KEY`: Your Google Maps API key

#### Notification Service (Required for email notifications)
- `NOTIFICATION_PROVIDER`: sendgrid (currently only SendGrid is supported)
- `SENDGRID_API_KEY`: Your SendGrid API key
- `SENDGRID_FROM_EMAIL`: From email address

#### Authentication
- `AUTH_PROVIDER`: custom (default)
- `JWT_SECRET`: Secret key for JWT signing (MUST be changed in production)

### Optional Environment Variables

#### Storage Configuration
- `STORAGE_PROVIDER`: local (default), aws-s3, or gcs
- For local storage:
  - `LOCAL_UPLOAD_PATH`: Upload directory (default: ./uploads)
  - `LOCAL_BASE_URL`: Base URL for files (default: http://localhost:3000)
- For AWS S3:
  - `AWS_REGION`: AWS region
  - `AWS_S3_BUCKET`: S3 bucket name
  - `AWS_ACCESS_KEY_ID`: AWS access key
  - `AWS_SECRET_ACCESS_KEY`: AWS secret key

#### CORS Configuration
- `CORS_ORIGIN`: Comma-separated list of allowed origins
- `CORS_CREDENTIALS`: Enable credentials (true/false)

#### Rate Limiting
- `RATE_LIMIT_WINDOW_MS`: Time window in milliseconds (default: 900000 = 15 minutes)
- `RATE_LIMIT_MAX`: Maximum requests per window (default: 100)

## Docker Architecture

### Multi-Stage Build

The production Dockerfile uses a multi-stage build process:

1. **Builder Stage**: Installs dependencies and builds the TypeScript application
2. **Production Stage**: Creates a minimal production image with only necessary files

Benefits:
- Smaller image size (only production dependencies)
- Faster deployment
- Better security (no build tools in production)

### Services

The docker-compose configuration includes three services:

#### 1. App Service
- Node.js application server
- Runs on port 3000 (configurable)
- Depends on database and redis services
- Includes health check endpoint

#### 2. Database Service
- PostgreSQL 15 Alpine
- Persistent data storage using Docker volumes
- Runs on port 5432 (configurable)
- Includes initialization script

#### 3. Redis Service
- Redis 7 Alpine
- Used for caching and session storage
- Persistent data using append-only file
- Runs on port 6379 (configurable)

## Deployment Scenarios

### Local Development

Use `docker-compose.dev.yml` for local development:

```bash
docker-compose -f docker-compose.dev.yml up
```

Features:
- Hot reloading enabled
- Source code mounted as volume
- Development database
- Detailed logging

### Production Deployment

Use `docker-compose.yml` for production:

```bash
docker-compose up -d
```

Features:
- Optimized production build
- Non-root user for security
- Health checks enabled
- Automatic restart on failure
- Persistent data volumes

### Cloud Deployment

#### AWS ECS/Fargate

1. Build and push image to ECR:
```bash
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com
docker build -t reusenet .
docker tag reusenet:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/reusenet:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/reusenet:latest
```

2. Create ECS task definition with environment variables
3. Create ECS service with load balancer
4. Configure RDS PostgreSQL instance
5. Configure ElastiCache Redis instance

#### Google Cloud Run

1. Build and push image to GCR:
```bash
gcloud builds submit --tag gcr.io/<project-id>/reusenet
```

2. Deploy to Cloud Run:
```bash
gcloud run deploy reusenet \
  --image gcr.io/<project-id>/reusenet \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production,DATABASE_URL=<connection-string>
```

3. Configure Cloud SQL PostgreSQL instance
4. Configure Memorystore Redis instance

#### Azure Container Instances

1. Build and push image to ACR:
```bash
az acr build --registry <registry-name> --image reusenet:latest .
```

2. Create container instance:
```bash
az container create \
  --resource-group <resource-group> \
  --name reusenet \
  --image <registry-name>.azurecr.io/reusenet:latest \
  --dns-name-label reusenet \
  --ports 3000 \
  --environment-variables NODE_ENV=production DATABASE_URL=<connection-string>
```

3. Configure Azure Database for PostgreSQL
4. Configure Azure Cache for Redis

## Database Management

### Running Migrations

Migrations are automatically run when the application starts. To run them manually:

```bash
# Inside the container
docker-compose exec app npm run db:migrate

# Or from host
docker-compose exec app node dist/infrastructure/database/cli.js migrate
```

### Seeding Data

To seed the database with test data:

```bash
docker-compose exec app npm run db:seed
```

### Database Backup

To backup the PostgreSQL database:

```bash
docker-compose exec database pg_dump -U postgres reusenet > backup.sql
```

To restore from backup:

```bash
docker-compose exec -T database psql -U postgres reusenet < backup.sql
```

## Monitoring and Logging

### Health Checks

The application includes a health check endpoint at `/health`:

```bash
curl http://localhost:3000/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 12345,
  "services": {
    "database": "connected",
    "redis": "connected"
  }
}
```

### Viewing Logs

View application logs:
```bash
docker-compose logs -f app
```

View database logs:
```bash
docker-compose logs -f database
```

View all logs:
```bash
docker-compose logs -f
```

### Log Rotation

For production, configure log rotation in docker-compose.yml:

```yaml
services:
  app:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

## Scaling

### Horizontal Scaling

To scale the application service:

```bash
docker-compose up -d --scale app=3
```

Note: You'll need to configure a load balancer (nginx, HAProxy, or cloud load balancer) to distribute traffic.

### Vertical Scaling

Adjust resource limits in docker-compose.yml:

```yaml
services:
  app:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

## Security Best Practices

### Production Checklist

- [ ] Change default `JWT_SECRET` to a strong, random value
- [ ] Use strong database passwords
- [ ] Enable HTTPS/TLS (use reverse proxy like nginx)
- [ ] Configure firewall rules to restrict database access
- [ ] Use secrets management (AWS Secrets Manager, Azure Key Vault, etc.)
- [ ] Enable Docker security scanning
- [ ] Run containers as non-root user (already configured)
- [ ] Keep Docker images updated
- [ ] Configure rate limiting appropriately
- [ ] Enable CORS only for trusted origins
- [ ] Use environment-specific `.env` files (never commit to git)
- [ ] Enable database encryption at rest
- [ ] Configure backup and disaster recovery
- [ ] Set up monitoring and alerting
- [ ] Review and audit logs regularly

### Secrets Management

For production, use a secrets management service instead of `.env` files:

#### AWS Secrets Manager
```bash
aws secretsmanager create-secret --name reusenet/database-password --secret-string "your-password"
```

#### Docker Secrets
```yaml
services:
  app:
    secrets:
      - db_password
      - jwt_secret

secrets:
  db_password:
    external: true
  jwt_secret:
    external: true
```

## Troubleshooting

### Application Won't Start

1. Check logs:
```bash
docker-compose logs app
```

2. Verify environment variables:
```bash
docker-compose exec app env | grep -E "DATABASE|API_KEY"
```

3. Check configuration validation errors in logs

### Database Connection Issues

1. Verify database is running:
```bash
docker-compose ps database
```

2. Test database connection:
```bash
docker-compose exec database psql -U postgres -d reusenet -c "SELECT 1"
```

3. Check database logs:
```bash
docker-compose logs database
```

### Out of Memory

1. Check container memory usage:
```bash
docker stats
```

2. Increase memory limits in docker-compose.yml
3. Optimize application queries and caching

### Disk Space Issues

1. Check disk usage:
```bash
docker system df
```

2. Clean up unused resources:
```bash
docker system prune -a --volumes
```

3. Configure log rotation

## Maintenance

### Updating the Application

1. Pull latest changes:
```bash
git pull origin main
```

2. Rebuild images:
```bash
docker-compose build
```

3. Restart services:
```bash
docker-compose down
docker-compose up -d
```

### Database Maintenance

Run VACUUM and ANALYZE periodically:
```bash
docker-compose exec database psql -U postgres -d reusenet -c "VACUUM ANALYZE"
```

### Backup Strategy

Recommended backup schedule:
- Daily database backups (retained for 7 days)
- Weekly full backups (retained for 4 weeks)
- Monthly archives (retained for 1 year)

Example backup script:
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
docker-compose exec -T database pg_dump -U postgres reusenet | gzip > backups/reusenet_$DATE.sql.gz
find backups/ -name "*.sql.gz" -mtime +7 -delete
```

## Support

For issues and questions:
- Check the logs first
- Review this deployment guide
- Check the configuration README at `src/config/README.md`
- Review error handling documentation at `docs/ERROR_HANDLING_AND_RESILIENCE.md`
