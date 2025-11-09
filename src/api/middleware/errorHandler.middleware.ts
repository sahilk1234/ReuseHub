import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';
import { ErrorLogger } from '../errors/ErrorLogger';

/**
 * Error response interface
 */
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
    requestId?: string;
    stack?: string;
  };
}

/**
 * Global error handling middleware
 * Requirement: All requirements need proper error handling
 * 
 * This middleware:
 * - Handles all application errors with proper HTTP status codes
 * - Logs errors with structured logging
 * - Provides user-friendly error messages
 * - Sanitizes error responses for production
 * - Integrates with monitoring services
 */
export const errorHandler = (
  error: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const logger = ErrorLogger.getInstance();
  const isDevelopment = process.env.NODE_ENV !== 'production';

  // Log the error with context
  logger.logError(error, req);

  // Prepare error response
  let statusCode = 500;
  let errorCode = 'INTERNAL_SERVER_ERROR';
  let message = 'An internal server error occurred';
  let details: any = undefined;

  // Handle AppError instances (our custom errors)
  if (error instanceof AppError) {
    statusCode = error.statusCode;
    errorCode = error.code;
    message = error.message;
    details = error.details;
  }
  // Handle known error types
  else if (error.name === 'ValidationError') {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    message = error.message;
  }
  else if (error.name === 'UnauthorizedError' || error.message.includes('token') || error.message.includes('unauthorized')) {
    statusCode = 401;
    errorCode = 'AUTHENTICATION_ERROR';
    message = 'Authentication failed';
  }
  else if (error.message.toLowerCase().includes('not found')) {
    statusCode = 404;
    errorCode = 'NOT_FOUND';
    message = error.message;
  }
  else if (error.message.toLowerCase().includes('permission') || error.message.toLowerCase().includes('forbidden')) {
    statusCode = 403;
    errorCode = 'AUTHORIZATION_ERROR';
    message = error.message;
  }
  else if (error.name === 'SyntaxError' && 'body' in error) {
    statusCode = 400;
    errorCode = 'INVALID_JSON';
    message = 'Invalid JSON in request body';
  }
  // Database errors
  else if (error.name === 'QueryFailedError' || error.message.includes('database')) {
    statusCode = 500;
    errorCode = 'DATABASE_ERROR';
    message = isDevelopment ? error.message : 'A database error occurred';
  }
  // Default error handling
  else {
    message = isDevelopment ? error.message : 'An internal server error occurred';
  }

  // Build error response
  const errorResponse: ErrorResponse = {
    error: {
      code: errorCode,
      message: sanitizeErrorMessage(message),
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] as string
    }
  };

  // Add details in development or for operational errors
  if (details && (isDevelopment || (error instanceof AppError && error.isOperational))) {
    errorResponse.error.details = details;
  }

  // Add stack trace in development for debugging
  if (isDevelopment && error.stack) {
    errorResponse.error.stack = error.stack;
  }

  // Send response
  res.status(statusCode).json(errorResponse);
};

/**
 * Sanitize error messages to prevent information leakage
 */
function sanitizeErrorMessage(message: string): string {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  if (isDevelopment) {
    return message;
  }

  // In production, sanitize sensitive information
  return message
    .replace(/password/gi, '***')
    .replace(/token/gi, '***')
    .replace(/secret/gi, '***')
    .replace(/key/gi, '***');
}

/**
 * Async error wrapper to catch errors in async route handlers
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 404 Not Found handler
 */
export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  res.status(404).json({
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id']
    }
  });
};
