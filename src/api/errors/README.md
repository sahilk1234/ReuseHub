# Error Handling System

This directory contains the comprehensive error handling system for Re:UseNet.

## Overview

The error handling system provides:
- Custom error classes with proper HTTP status codes
- Structured error logging with monitoring integration
- Validation helpers for common validation patterns
- User-friendly error responses
- Security-focused error sanitization

## Error Classes

### Base Error
- `AppError` - Base class for all application errors

### Client Errors (4xx)
- `ValidationError` (400) - Request validation failures
- `AuthenticationError` (401) - Authentication failures
- `AuthorizationError` (403) - Permission denied
- `NotFoundError` (404) - Resource not found
- `ConflictError` (409) - Data conflicts
- `BusinessLogicError` (422) - Business rule violations
- `RateLimitError` (429) - Rate limit exceeded

### Server Errors (5xx)
- `DatabaseError` (500) - Database errors
- `ExternalServiceError` (502) - External service failures
- `ServiceUnavailableError` (503) - Service temporarily unavailable

## Usage Examples

### Throwing Errors

```typescript
import { ValidationError, NotFoundError, BusinessLogicError } from '@/api/errors';

// Validation error
throw new ValidationError('Invalid email format', { field: 'email' });

// Not found error
throw new NotFoundError('User', userId);

// Business logic error
throw new BusinessLogicError('Cannot delete item with pending exchanges');
```

### Using Validation Helpers

```typescript
import { ValidationHelper } from '@/api/errors';

// Validate required fields
ValidationHelper.validateRequired(data, ['email', 'password']);

// Validate email
ValidationHelper.validateEmail(email);

// Validate string length
ValidationHelper.validateLength(username, 'username', 3, 20);

// Validate numeric range
ValidationHelper.validateRange(age, 'age', 18, 120);

// Validate enum
ValidationHelper.validateEnum(status, 'status', ['active', 'inactive']);
```

### Error Logging

```typescript
import { ErrorLogger } from '@/api/errors';

const logger = ErrorLogger.getInstance();

// Log error with request context
logger.logError(error, req);

// Log warning
logger.logWarning('Service degraded', { service: 'AI' });

// Log info
logger.logInfo('Operation completed', { duration: 1234 });
```

## Error Response Format

All errors return a consistent JSON format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email format",
    "details": {
      "field": "email"
    },
    "timestamp": "2024-01-01T12:00:00.000Z",
    "requestId": "req-123"
  }
}
```

## Middleware

The global error handler middleware automatically:
- Catches all errors in route handlers
- Logs errors with context
- Sanitizes error messages for production
- Returns appropriate HTTP status codes
- Adds request IDs for tracing

## Security

- Sensitive information is sanitized in production
- Stack traces only included in development
- Error details controlled by `isOperational` flag
- Rate limiting prevents abuse

## Integration

The error handling system integrates with:
- Express middleware chain
- Logging systems (console, external services)
- Monitoring services (Sentry, DataDog, etc.)
- Circuit breakers for external services
