import { Request, Response, NextFunction } from 'express';
import { DIContainer } from '@/container/Container';
import { TYPES } from '@/container/types';
import { IAuthenticationService, AuthResult } from '@/infrastructure/services/IAuthenticationService';

// Extend Express Request to include user information
declare global {
  namespace Express {
    interface Request {
      user?: AuthResult;
      userId?: string;
    }
  }
}

/**
 * Authentication middleware that validates JWT tokens
 * Requirement 5.1: System SHALL require users to verify their identity
 * Requirement 5.2: System SHALL provide secure communication
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      res.status(401).json({
        error: {
          code: 'MISSING_AUTH_TOKEN',
          message: 'Authorization header is required',
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    // Check for Bearer token format
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      res.status(401).json({
        error: {
          code: 'INVALID_AUTH_FORMAT',
          message: 'Authorization header must be in format: Bearer <token>',
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    const token = parts[1];

    // Get authentication service from DI container
    const authService = DIContainer.getInstance().get<IAuthenticationService>(
      TYPES.IAuthenticationService
    );

    // Authenticate the token
    const authResult = await authService.authenticate(token);

    // Attach user information to request
    req.user = authResult;
    req.userId = authResult.userId;

    next();
  } catch (error: any) {
    console.error('Authentication error:', error);
    
    res.status(401).json({
      error: {
        code: 'AUTHENTICATION_FAILED',
        message: error.message || 'Invalid or expired token',
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Optional authentication middleware - doesn't fail if no token provided
 * Useful for endpoints that work differently for authenticated vs anonymous users
 */
export const optionalAuthenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      // No token provided, continue without authentication
      next();
      return;
    }

    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      const token = parts[1];
      
      const authService = DIContainer.getInstance().get<IAuthenticationService>(
        TYPES.IAuthenticationService
      );

      try {
        const authResult = await authService.authenticate(token);
        req.user = authResult;
        req.userId = authResult.userId;
      } catch (error) {
        // Invalid token, but continue without authentication
        console.warn('Optional authentication failed:', error);
      }
    }

    next();
  } catch (error) {
    // Any error in optional auth should not block the request
    console.error('Optional authentication error:', error);
    next();
  }
};

/**
 * Middleware to require verified users
 * Requirement 5.1: System SHALL require users to verify their identity
 */
export const requireVerified = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({
      error: {
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Authentication is required',
        timestamp: new Date().toISOString()
      }
    });
    return;
  }

  if (!req.user.isVerified) {
    res.status(403).json({
      error: {
        code: 'VERIFICATION_REQUIRED',
        message: 'Email verification is required to access this resource',
        timestamp: new Date().toISOString()
      }
    });
    return;
  }

  next();
};

/**
 * Middleware to check for specific roles
 */
export const requireRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication is required',
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    const userRoles = req.user.roles || [];
    const hasRole = roles.some(role => userRoles.includes(role));

    if (!hasRole) {
      res.status(403).json({
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: `Required role: ${roles.join(' or ')}`,
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    next();
  };
};
