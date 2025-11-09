/**
 * Base application error class
 * All custom errors should extend this class
 */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: any,
    public readonly isOperational: boolean = true
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      ...(this.details && { details: this.details })
    };
  }
}

/**
 * Validation Error (400)
 * Used when request data fails validation
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(400, 'VALIDATION_ERROR', message, details);
  }
}

/**
 * Authentication Error (401)
 * Used when authentication fails or token is invalid
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed', details?: any) {
    super(401, 'AUTHENTICATION_ERROR', message, details);
  }
}

/**
 * Authorization Error (403)
 * Used when user doesn't have permission for an action
 */
export class AuthorizationError extends AppError {
  constructor(message: string = 'You do not have permission to perform this action', details?: any) {
    super(403, 'AUTHORIZATION_ERROR', message, details);
  }
}

/**
 * Not Found Error (404)
 * Used when a requested resource doesn't exist
 */
export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string) {
    const message = identifier 
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;
    super(404, 'NOT_FOUND', message);
  }
}

/**
 * Conflict Error (409)
 * Used when there's a conflict with existing data
 */
export class ConflictError extends AppError {
  constructor(message: string, details?: any) {
    super(409, 'CONFLICT', message, details);
  }
}

/**
 * Business Logic Error (422)
 * Used when business rules are violated
 */
export class BusinessLogicError extends AppError {
  constructor(message: string, details?: any) {
    super(422, 'BUSINESS_LOGIC_ERROR', message, details);
  }
}

/**
 * External Service Error (502)
 * Used when an external service fails
 */
export class ExternalServiceError extends AppError {
  constructor(
    public readonly serviceName: string,
    message: string,
    details?: any
  ) {
    super(502, 'EXTERNAL_SERVICE_ERROR', message, details);
  }
}

/**
 * Service Unavailable Error (503)
 * Used when a service is temporarily unavailable
 */
export class ServiceUnavailableError extends AppError {
  constructor(
    public readonly serviceName: string,
    message: string = 'Service temporarily unavailable',
    details?: any
  ) {
    super(503, 'SERVICE_UNAVAILABLE', message, details);
  }
}

/**
 * Rate Limit Error (429)
 * Used when rate limits are exceeded
 */
export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests', retryAfter?: number) {
    super(429, 'RATE_LIMIT_EXCEEDED', message, { retryAfter });
  }
}

/**
 * Database Error (500)
 * Used for database-related errors
 */
export class DatabaseError extends AppError {
  constructor(message: string, details?: any) {
    super(500, 'DATABASE_ERROR', message, details, false);
  }
}
