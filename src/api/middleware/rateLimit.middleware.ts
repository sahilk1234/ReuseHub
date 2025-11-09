import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { DIContainer } from '@/container/Container';
import { TYPES } from '@/container/types';
import { AppConfig } from '@/config/AppConfig';

/**
 * Get rate limit configuration from app config
 */
const getRateLimitConfig = () => {
  const config = DIContainer.getInstance().get<AppConfig>(TYPES.AppConfig);
  return config.rateLimit;
};

/**
 * Standard rate limiter for general API endpoints
 * Requirement 5.2: Implement rate limiting for security
 */
export const standardRateLimiter = rateLimit({
  windowMs: getRateLimitConfig().windowMs,
  max: getRateLimitConfig().max,
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP, please try again later',
      timestamp: new Date().toISOString()
    }
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests from this IP, please try again later',
        timestamp: new Date().toISOString(),
        retryAfter: res.getHeader('Retry-After')
      }
    });
  }
});

/**
 * Strict rate limiter for authentication endpoints
 * Prevents brute force attacks
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    error: {
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts, please try again later',
      timestamp: new Date().toISOString()
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: {
        code: 'AUTH_RATE_LIMIT_EXCEEDED',
        message: 'Too many authentication attempts from this IP, please try again later',
        timestamp: new Date().toISOString(),
        retryAfter: res.getHeader('Retry-After')
      }
    });
  }
});

/**
 * Lenient rate limiter for file upload endpoints
 * Allows fewer requests but with larger time window
 */
export const uploadRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Limit each IP to 20 uploads per hour
  message: {
    error: {
      code: 'UPLOAD_RATE_LIMIT_EXCEEDED',
      message: 'Too many upload requests, please try again later',
      timestamp: new Date().toISOString()
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: {
        code: 'UPLOAD_RATE_LIMIT_EXCEEDED',
        message: 'Too many upload requests from this IP, please try again later',
        timestamp: new Date().toISOString(),
        retryAfter: res.getHeader('Retry-After')
      }
    });
  }
});

/**
 * Strict rate limiter for search endpoints
 * Prevents abuse of expensive search operations
 */
export const searchRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // Limit each IP to 30 searches per minute
  message: {
    error: {
      code: 'SEARCH_RATE_LIMIT_EXCEEDED',
      message: 'Too many search requests, please slow down',
      timestamp: new Date().toISOString()
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: {
        code: 'SEARCH_RATE_LIMIT_EXCEEDED',
        message: 'Too many search requests from this IP, please slow down',
        timestamp: new Date().toISOString(),
        retryAfter: res.getHeader('Retry-After')
      }
    });
  }
});
