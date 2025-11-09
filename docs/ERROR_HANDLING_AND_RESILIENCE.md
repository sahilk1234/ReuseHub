# Error Handling and Resilience Implementation

This document describes the comprehensive error handling and resilience patterns implemented for Re:UseNet.

## Task 8.1: Global Error Handling Middleware ✅

### Implemented Components

#### 1. Custom Error Classes (`src/api/errors/AppError.ts`)
- **AppError** - Base error class with status codes and error codes
- **ValidationError** (400) - Request validation failures
- **AuthenticationError** (401) - Authentication failures
- **AuthorizationError** (403) - Permission denied
- **NotFoundError** (404) - Resource not found
- **ConflictError** (409) - Data conflicts
- **BusinessLogicError** (422) - Business rule violations
- **RateLimitError** (429) - Rate limit exceeded
- **DatabaseError** (500) - Database errors
- **ExternalServiceError** (502) - External service failures
- **ServiceUnavailableError** (503) - Service temporarily unavailable

#### 2. Error Logger (`src/api/errors/ErrorLogger.ts`)
- Structured logging with context
- Request information extraction
- Environment-aware logging (dev vs production)
- Integration points for monitoring services (Sentry, DataDog)
- Color-coded console output
- Error, warning, and info log levels

#### 3. Validation Helper (`src/api/errors/ValidationHelper.ts`)
Comprehensive validation utilities:
- Required field validation
- Email format validation
- String length validation
- Numeric range validation
- Enum validation
- Array validation
- Coordinate validation
- URL validation
- Phone number validation
- Date validation
- File size and type validation
- XSS prevention (string sanitization)
- Pagination parameter validation

#### 4. Enhanced Error Handler Middleware (`src/api/middleware/errorHandler.middleware.ts`)
- Centralized error handling
- Proper HTTP status code mapping
- User-friendly error messages
- Security-focused error sanitization
- Request ID tracking
- Development vs production error details
- Integration with ErrorLogger

#### 5. Validation Middleware (`src/api/middleware/validation.middleware.ts`)
Pre-built validation middleware for:
- Item creation and updates
- Item search queries
- User registration
- Exchange creation
- Rating submission
- File uploads
- Request body sanitization

#### 6. Rate Limiting Middleware (`src/api/middleware/rateLimiter.middleware.ts`)
- In-memory rate limiter (Redis-ready)
- Configurable time windows and request limits
- Custom key generation
- Rate limit headers (X-RateLimit-*)
- Pre-configured limiters:
  - `strictRateLimit` - For sensitive endpoints (5 req/15min)
  - `apiRateLimit` - For standard API endpoints (100 req/15min)
  - `readOnlyRateLimit` - For read operations (300 req/15min)
  - `uploadRateLimit` - For file uploads (20 req/hour)

### Features

✅ Centralized error handling with proper HTTP status codes  
✅ Structured error logging with monitoring integration  
✅ User-friendly error responses  
✅ Validation messages with detailed context  
✅ Security-focused error sanitization  
✅ Rate limiting to prevent abuse  
✅ Request ID tracking for debugging  
✅ Environment-aware error details  

## Task 8.2: Circuit Breaker Pattern for External Services ✅

### Implemented Components

#### 1. Circuit Breaker (`src/infrastructure/resilience/CircuitBreaker.ts`)
- Three states: CLOSED, OPEN, HALF_OPEN
- Configurable failure/success thresholds
- Automatic timeout and recovery
- State transition callbacks
- Comprehensive statistics tracking
- Request counting and failure tracking

**Configuration Options:**
- `failureThreshold` - Failures before opening circuit
- `successThreshold` - Successes to close from half-open
- `timeout` - Wait time before retry attempt
- `onStateChange` - Callback for state transitions

#### 2. Service Health Monitor (`src/infrastructure/resilience/ServiceHealthMonitor.ts`)
- Centralized health monitoring
- Circuit breaker registration and management
- Health check function registration
- Periodic health monitoring
- System-wide health status
- Manual circuit breaker reset
- Statistics aggregation

**Features:**
- Register circuit breakers for services
- Register custom health check functions
- Start/stop periodic monitoring
- Check individual service health
- Get overall system health
- Reset circuit breakers manually

#### 3. Resilient AI Service (`src/infrastructure/services/adapters/ResilientAIService.ts`)
Wraps AI service with resilience:
- Circuit breaker protection
- Automatic fallback mechanisms
- Health monitoring integration
- Graceful degradation

**Fallback Strategies:**
- Image analysis → Basic placeholder
- Categorization → Keyword matching
- Tag generation → Keyword extraction
- Similarity search → Text matching

#### 4. Health Check Controller (`src/api/controllers/health.controller.ts`)
REST endpoints for monitoring:
- `GET /health` - Overall system health
- `GET /health/:serviceName` - Specific service health
- `GET /health/circuit-breakers` - Circuit breaker stats
- `POST /health/circuit-breakers/:serviceName/reset` - Reset specific
- `POST /health/circuit-breakers/reset-all` - Reset all

### Features

✅ Circuit breaker pattern for AI service calls  
✅ Automatic fallback mechanisms when services unavailable  
✅ Service health monitoring with periodic checks  
✅ Automatic recovery when services restore  
✅ Health check endpoints for monitoring  
✅ Manual circuit breaker reset capability  
✅ Comprehensive statistics and metrics  
✅ Graceful degradation of functionality  

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Item       │  │   User       │  │  Exchange    │      │
│  │   Service    │  │   Service    │  │   Service    │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
└─────────┼──────────────────┼──────────────────┼─────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│              Resilient Service Layer                         │
│  ┌──────────────────────────────────────────────────┐       │
│  │         ResilientAIService (Wrapper)             │       │
│  │  ┌────────────────┐  ┌──────────────────────┐   │       │
│  │  │ Circuit Breaker│  │  Fallback Mechanisms │   │       │
│  │  └────────┬───────┘  └──────────────────────┘   │       │
│  └───────────┼──────────────────────────────────────┘       │
└──────────────┼──────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│                  External AI Service                         │
│                    (OpenAI, etc.)                            │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   Error Handling Flow                        │
│                                                               │
│  Request → Validation → Controller → Service → Error?       │
│                                                    │          │
│                                                    ▼          │
│                                          Error Handler       │
│                                                    │          │
│                                                    ▼          │
│                                            Error Logger       │
│                                                    │          │
│                                                    ▼          │
│                                          JSON Response        │
└─────────────────────────────────────────────────────────────┘
```

## Usage Examples

### Throwing Custom Errors

```typescript
import { ValidationError, NotFoundError, BusinessLogicError } from '@/api/errors';

// Validation error
throw new ValidationError('Invalid email format', { field: 'email' });

// Not found
throw new NotFoundError('Item', itemId);

// Business logic
throw new BusinessLogicError('Cannot delete item with pending exchanges');
```

### Using Circuit Breaker

```typescript
import { CircuitBreaker } from '@/infrastructure/resilience';

const circuitBreaker = new CircuitBreaker('AIService', {
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 60000
});

try {
  const result = await circuitBreaker.execute(async () => {
    return await aiService.analyzeImage(imageUrl);
  });
} catch (error) {
  // Use fallback
  return fallbackAnalysis();
}
```

### Monitoring Service Health

```typescript
import { ServiceHealthMonitor } from '@/infrastructure/resilience';

const monitor = ServiceHealthMonitor.getInstance();

// Start monitoring
monitor.startMonitoring(60000);

// Check health
const health = await monitor.getSystemHealth();
console.log(`System healthy: ${health.healthy}`);
console.log(`Services: ${health.summary.healthy}/${health.summary.total}`);
```

## Testing

The implementation includes:
- Type-safe error classes
- Configurable circuit breakers
- Testable fallback mechanisms
- Health check endpoints
- Statistics and metrics

## Requirements Satisfied

### Task 8.1 Requirements
✅ Implement centralized error handling with proper HTTP status codes  
✅ Add error logging and monitoring integration  
✅ Create user-friendly error responses and validation messages  
✅ All requirements need proper error handling  

### Task 8.2 Requirements
✅ Implement circuit breaker for AI service calls  
✅ Add fallback mechanisms when external services are unavailable  
✅ Create service health monitoring and automatic recovery  
✅ Requirements: 3.1, 3.3, 3.5 (AI service resilience)  

## Future Enhancements

1. **Monitoring Integration**
   - Sentry for error tracking
   - DataDog for metrics
   - Prometheus for monitoring

2. **Distributed Rate Limiting**
   - Redis-based rate limiter
   - Distributed circuit breakers

3. **Advanced Fallbacks**
   - Cached responses
   - Stale-while-revalidate pattern
   - Progressive degradation

4. **Alerting**
   - Circuit breaker state change alerts
   - Error rate threshold alerts
   - Service health degradation alerts

## Documentation

- Error handling: `src/api/errors/README.md`
- Resilience patterns: `src/infrastructure/resilience/README.md`
- This document: `docs/ERROR_HANDLING_AND_RESILIENCE.md`
