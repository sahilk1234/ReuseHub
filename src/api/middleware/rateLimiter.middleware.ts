import { Request, Response, NextFunction } from 'express';
import { RateLimitError } from '../errors/AppError';

/**
 * Simple in-memory rate limiter
 * In production, use Redis for distributed rate limiting
 */
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private requests: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  /**
   * Check if request should be rate limited
   */
  checkLimit(
    key: string,
    maxRequests: number,
    windowMs: number
  ): { allowed: boolean; retryAfter?: number } {
    const now = Date.now();
    const entry = this.requests.get(key);

    // No previous requests or window expired
    if (!entry || now > entry.resetTime) {
      this.requests.set(key, {
        count: 1,
        resetTime: now + windowMs
      });
      return { allowed: true };
    }

    // Within window, check count
    if (entry.count < maxRequests) {
      entry.count++;
      return { allowed: true };
    }

    // Rate limit exceeded
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    return { allowed: false, retryAfter };
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.requests.entries()) {
      if (now > entry.resetTime) {
        this.requests.delete(key);
      }
    }
  }

  /**
   * Clear all entries (for testing)
   */
  clear(): void {
    this.requests.clear();
  }

  /**
   * Destroy the rate limiter
   */
  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.requests.clear();
  }
}

// Singleton instance
const rateLimiter = new RateLimiter();

/**
 * Rate limiting middleware factory
 */
export function rateLimit(options: {
  windowMs?: number;
  maxRequests?: number;
  keyGenerator?: (req: Request) => string;
  skipSuccessfulRequests?: boolean;
  message?: string;
}) {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    maxRequests = 100,
    keyGenerator = (req: Request) => req.ip || 'unknown',
    skipSuccessfulRequests = false,
    message = 'Too many requests, please try again later'
  } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = keyGenerator(req);
    const { allowed, retryAfter } = rateLimiter.checkLimit(key, maxRequests, windowMs);

    if (!allowed) {
      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', '0');
      res.setHeader('X-RateLimit-Reset', new Date(Date.now() + (retryAfter! * 1000)).toISOString());
      res.setHeader('Retry-After', retryAfter!.toString());

      throw new RateLimitError(message, retryAfter);
    }

    // Set rate limit headers for successful requests
    const entry = (rateLimiter as any).requests.get(key);
    if (entry) {
      res.setHeader('X-RateLimit-Limit', maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', (maxRequests - entry.count).toString());
      res.setHeader('X-RateLimit-Reset', new Date(entry.resetTime).toISOString());
    }

    // If skipSuccessfulRequests is true, decrement on successful response
    if (skipSuccessfulRequests) {
      const originalSend = res.send;
      res.send = function (data: any): Response {
        if (res.statusCode < 400) {
          const entry = (rateLimiter as any).requests.get(key);
          if (entry && entry.count > 0) {
            entry.count--;
          }
        }
        return originalSend.call(this, data);
      };
    }

    next();
  };
}

/**
 * Strict rate limiter for sensitive endpoints (e.g., login, registration)
 */
export const strictRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5,
  message: 'Too many attempts, please try again later'
});

/**
 * Standard rate limiter for API endpoints
 */
export const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100
});

/**
 * Lenient rate limiter for read-only endpoints
 */
export const readOnlyRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 300,
  skipSuccessfulRequests: true
});

/**
 * Rate limiter for file uploads
 */
export const uploadRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 20,
  message: 'Too many uploads, please try again later'
});

/**
 * Export rate limiter instance for testing
 */
export { rateLimiter };
