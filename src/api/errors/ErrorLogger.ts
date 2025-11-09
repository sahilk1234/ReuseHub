import { Request } from 'express';
import { AppError } from './AppError';

export interface ErrorLogEntry {
  timestamp: string;
  level: 'error' | 'warn' | 'info';
  message: string;
  code?: string;
  statusCode?: number;
  stack?: string;
  requestId?: string;
  userId?: string;
  path?: string;
  method?: string;
  ip?: string;
  userAgent?: string;
  details?: any;
}

/**
 * Error logger with structured logging
 * In production, this would integrate with services like Winston, Sentry, etc.
 */
export class ErrorLogger {
  private static instance: ErrorLogger;

  private constructor() {}

  static getInstance(): ErrorLogger {
    if (!ErrorLogger.instance) {
      ErrorLogger.instance = new ErrorLogger();
    }
    return ErrorLogger.instance;
  }

  /**
   * Log an error with context
   */
  logError(error: Error | AppError, req?: Request): void {
    const logEntry = this.createLogEntry(error, 'error', req);
    
    // In production, send to monitoring service (Sentry, DataDog, etc.)
    if (process.env.NODE_ENV === 'production') {
      this.sendToMonitoringService(logEntry);
    }

    // Console logging with formatting
    this.consoleLog(logEntry);
  }

  /**
   * Log a warning
   */
  logWarning(message: string, details?: any, req?: Request): void {
    const logEntry: ErrorLogEntry = {
      timestamp: new Date().toISOString(),
      level: 'warn',
      message,
      details,
      ...(req && this.extractRequestInfo(req))
    };

    this.consoleLog(logEntry);
  }

  /**
   * Log info message
   */
  logInfo(message: string, details?: any): void {
    const logEntry: ErrorLogEntry = {
      timestamp: new Date().toISOString(),
      level: 'info',
      message,
      details
    };

    this.consoleLog(logEntry);
  }

  /**
   * Create structured log entry
   */
  private createLogEntry(error: Error | AppError, level: 'error' | 'warn' | 'info', req?: Request): ErrorLogEntry {
    const entry: ErrorLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message: error.message,
      stack: error.stack
    };

    if (error instanceof AppError) {
      entry.code = error.code;
      entry.statusCode = error.statusCode;
      entry.details = error.details;
    }

    if (req) {
      Object.assign(entry, this.extractRequestInfo(req));
    }

    return entry;
  }

  /**
   * Extract relevant request information
   */
  private extractRequestInfo(req?: Request): Partial<ErrorLogEntry> {
    if (!req) return {};
    
    return {
      requestId: req.headers['x-request-id'] as string,
      userId: (req as any).user?.userId,
      path: req.path,
      method: req.method,
      ip: req.ip || req.socket.remoteAddress,
      userAgent: req.headers['user-agent']
    };
  }

  /**
   * Console logging with color coding
   */
  private consoleLog(entry: ErrorLogEntry): void {
    const isDevelopment = process.env.NODE_ENV !== 'production';

    if (entry.level === 'error') {
      console.error('\n❌ ERROR:', {
        timestamp: entry.timestamp,
        code: entry.code,
        message: entry.message,
        ...(entry.requestId && { requestId: entry.requestId }),
        ...(entry.userId && { userId: entry.userId }),
        ...(entry.path && { path: `${entry.method} ${entry.path}` }),
        ...(entry.details && { details: entry.details }),
        ...(isDevelopment && entry.stack && { stack: entry.stack })
      });
    } else if (entry.level === 'warn') {
      console.warn('\n⚠️  WARNING:', {
        timestamp: entry.timestamp,
        message: entry.message,
        ...(entry.details && { details: entry.details })
      });
    } else {
      console.log('\nℹ️  INFO:', {
        timestamp: entry.timestamp,
        message: entry.message,
        ...(entry.details && { details: entry.details })
      });
    }
  }

  /**
   * Send to external monitoring service
   * This is a placeholder for integration with services like Sentry, DataDog, etc.
   */
  private sendToMonitoringService(entry: ErrorLogEntry): void {
    // TODO: Integrate with monitoring service
    // Example: Sentry.captureException(error, { extra: entry });
    
    // For now, just ensure critical errors are logged
    if (entry.statusCode && entry.statusCode >= 500) {
      console.error('CRITICAL ERROR - Would send to monitoring service:', entry);
    }
  }
}
