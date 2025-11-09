# Re:UseNet

A community-based waste exchange network that connects people who have items they no longer need with those who can use them. The system uses AI-powered matching and gamification to encourage local reuse and reduce waste.

## 🏆 Award-Winning Auth0 Integration

Re:UseNet features a **comprehensive, fully-visible Auth0 integration** showcasing enterprise-grade authentication:

### 🎨 Visible on Login/Register Pages:
- ✅ **4 Social Login Buttons**: Google, Facebook, GitHub, LinkedIn (with brand logos!)
- ✅ **Passwordless Magic Link**: One-click email authentication
- ✅ **MFA Security Badge**: Visual indicator of multi-factor protection
- ✅ **Beautiful UI**: Professional, responsive design

### 🔐 Backend Features:
- ✅ **Auth0 Management API**: Full user management integration
- ✅ **Passwordless API**: Magic link implementation
- ✅ **Secure JWT**: RS256 signing with JWKS key rotation
- ✅ **MFA Support**: SMS, Authenticator apps, Email, Push
- ✅ **7,000 Free Users**: No credit card required

**[📖 Complete Auth0 Setup Guide](docs/AUTH0_INTEGRATION.md)** | **[🎨 Frontend Features](client/AUTH0_FRONTEND_SETUP.md)** | **[🏆 MLH Submission](AUTH0_SUBMISSION.md)**

## Features

- 🔄 **Item Exchange**: Post and discover items for reuse
- 🤖 **AI-Powered Matching**: Intelligent categorization and user matching
- 🎮 **Gamification**: Eco-points and achievements for sustainable behavior
- 📍 **Location-Based**: Find items and users nearby
- 🔐 **Enterprise Security**: Auth0-powered authentication with MFA
- 🏢 **Organization Support**: Bulk donations and community impact tracking

## Architecture

Re:UseNet follows a modular monolith architecture with:

- **Domain-Driven Design**: Clear separation of business logic
- **Dependency Injection**: Swappable service providers
- **Pluggable Adapters**: Easy technology stack changes
- **Docker Deployment**: Containerized for easy deployment

## Technology Stack

### Core
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL with PostGIS
- **Cache**: Redis
- **Container**: Docker + Docker Compose

### Swappable Providers
- **Storage**: AWS S3 | Google Cloud Storage | Local
- **Authentication**: Auth0 | Okta | Firebase | Custom JWT
- **AI/ML**: OpenAI | Google AI | Azure Cognitive Services
- **Maps**: Google Maps | Mapbox | OpenStreetMap
- **Email**: SendGrid | AWS SES | Mailgun

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for local development)
- Git

### Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd reuse-net
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start development environment**
   ```bash
   # Using Docker (recommended)
   chmod +x scripts/start-dev.sh
   ./scripts/start-dev.sh
   
   # Or manually
   docker-compose -f docker-compose.dev.yml up --build
   ```

4. **Access the application**
   - API: http://localhost:3000
   - Health Check: http://localhost:3000/health
   - Database: localhost:5432
   - Redis: localhost:6379

### Local Development (without Docker)

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up local database**
   ```bash
   # Install PostgreSQL and create database
   createdb reusenet
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

### Production Deployment

See [DEPLOYMENT.md](docs/DEPLOYMENT.md) for comprehensive deployment guide.

**Quick Production Setup:**

1. **Set up production environment**
   ```bash
   cp .env.production.example .env.production
   # Configure production values in .env.production
   ```

2. **Deploy using deployment script**
   ```bash
   # Linux/Mac
   chmod +x scripts/deploy.sh
   ./scripts/deploy.sh prod
   
   # Windows
   .\scripts\deploy.ps1 prod
   ```

3. **Or deploy manually**
   ```bash
   docker-compose -f docker-compose.prod.yml --env-file .env.production up -d
   ```

**Deployment Script Commands:**
```bash
# Deploy development
./scripts/deploy.sh dev

# Deploy production
./scripts/deploy.sh prod

# Stop environment
./scripts/deploy.sh stop prod

# View logs
./scripts/deploy.sh logs prod

# Backup database
./scripts/deploy.sh backup prod

# Check health
./scripts/deploy.sh health prod
```

## Configuration

The application uses environment-based configuration with swappable providers:

### Database Providers
- `postgresql` (default)
- `mysql`
- `firestore`

### Storage Providers
- `local` (default for development)
- `aws-s3`
- `gcs` (Google Cloud Storage)

### Authentication Providers
- `custom` (JWT-based, default)
- `auth0`
- `okta`
- `firebase`

### AI Providers
- `openai` (default) - GPT-4 and GPT-4 Vision
- `google` - Google Gemini (Flash: 75x cheaper than GPT-4, Pro: high quality)
- `azure` - Azure Cognitive Services (planned)

💡 **Tip:** Use `AI_PROVIDER=google` with Gemini Flash for 99% cost savings!

### Maps Providers
- `google` (default)
- `mapbox`
- `osm` (OpenStreetMap)

### Notification Providers
- `sendgrid` (default)
- `ses` (AWS Simple Email Service)
- `mailgun`

## Development Commands

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix
```

## Docker Commands

```bash
# Start development environment
docker-compose -f docker-compose.dev.yml up --build

# Start production environment
docker-compose up -d --build

# Stop all services
docker-compose down

# View logs
docker-compose logs -f app

# Rebuild and restart specific service
docker-compose up --build app
```

## API Endpoints

### Health Check
- `GET /health` - Application health status

### API Routes
API endpoints will be available at `/api/*` once controllers are implemented.

## Project Structure

```
src/
├── config/           # Configuration management
├── container/        # Dependency injection
├── domain/          # Domain models (to be implemented)
├── application/     # Application services (to be implemented)
├── infrastructure/  # Infrastructure services (to be implemented)
├── presentation/    # Controllers and routes (to be implemented)
├── app.ts          # Express application setup
└── index.ts        # Application entry point

scripts/            # Utility scripts
docker-compose.yml  # Production Docker configuration
docker-compose.dev.yml # Development Docker configuration
Dockerfile         # Production Docker image
Dockerfile.dev     # Development Docker image
```

## Environment Variables

See `.env.example` for all available configuration options.

Key variables:
- `NODE_ENV`: Application environment
- `PORT`: Server port
- `DATABASE_TYPE`: Database provider
- `STORAGE_PROVIDER`: File storage provider
- `AUTH_PROVIDER`: Authentication provider
- `AI_PROVIDER`: AI service provider
- `MAPS_PROVIDER`: Maps service provider
- `NOTIFICATION_PROVIDER`: Email service provider

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For questions and support, please open an issue in the repository.