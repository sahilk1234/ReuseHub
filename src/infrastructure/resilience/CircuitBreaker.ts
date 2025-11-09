import { ServiceUnavailableError } from '@/api/errors/AppError';
import { ErrorLogger } from '@/api/errors/ErrorLogger';

/**
 * Circuit breaker states
 */
export enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Failing, reject requests
  HALF_OPEN = 'HALF_OPEN' // Testing if service recovered
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  failureThreshold: number;      // Number of failures before opening circuit
  successThreshold: number;      // Number of successes to close circuit from half-open
  timeout: number;               // Time in ms before attempting to close circuit
  monitoringPeriod?: number;     // Time window for counting failures (ms)
  onStateChange?: (state: CircuitState) => void;
}

/**
 * Circuit breaker statistics
 */
export interface CircuitBreakerStats {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailureTime?: Date;
  lastSuccessTime?: Date;
  totalRequests: number;
  totalFailures: number;
  totalSuccesses: number;
}

/**
 * Circuit Breaker Pattern Implementation
 * 
 * Prevents cascading failures by stopping requests to failing services
 * Requirements: 3.1, 3.3, 3.5 - AI service resilience
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastFailureTime?: Date;
  private lastSuccessTime?: Date;
  private nextAttemptTime?: Date;
  private totalRequests: number = 0;
  private totalFailures: number = 0;
  private totalSuccesses: number = 0;
  private logger = ErrorLogger.getInstance();

  constructor(
    private readonly serviceName: string,
    private readonly config: CircuitBreakerConfig
  ) {
    this.validateConfig();
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.totalRequests++;

    // Check if circuit is open
    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.transitionTo(CircuitState.HALF_OPEN);
      } else {
        const waitTime = this.nextAttemptTime 
          ? Math.ceil((this.nextAttemptTime.getTime() - Date.now()) / 1000)
          : this.config.timeout / 1000;
        
        throw new ServiceUnavailableError(
          this.serviceName,
          `Circuit breaker is OPEN for ${this.serviceName}. Service temporarily unavailable.`,
          { retryAfter: waitTime }
        );
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error);
      throw error;
    }
  }

  /**
   * Handle successful execution
   */
  private onSuccess(): void {
    this.lastSuccessTime = new Date();
    this.totalSuccesses++;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      
      if (this.successCount >= this.config.successThreshold) {
        this.transitionTo(CircuitState.CLOSED);
      }
    } else if (this.state === CircuitState.CLOSED) {
      // Reset failure count on success in closed state
      this.failureCount = 0;
    }
  }

  /**
   * Handle failed execution
   */
  private onFailure(error: any): void {
    this.lastFailureTime = new Date();
    this.failureCount++;
    this.totalFailures++;

    this.logger.logWarning(
      `Circuit breaker failure for ${this.serviceName}`,
      {
        failureCount: this.failureCount,
        threshold: this.config.failureThreshold,
        error: error.message
      }
    );

    if (this.state === CircuitState.HALF_OPEN) {
      // Any failure in half-open state reopens the circuit
      this.transitionTo(CircuitState.OPEN);
    } else if (this.state === CircuitState.CLOSED) {
      if (this.failureCount >= this.config.failureThreshold) {
        this.transitionTo(CircuitState.OPEN);
      }
    }
  }

  /**
   * Transition to a new state
   */
  private transitionTo(newState: CircuitState): void {
    const oldState = this.state;
    this.state = newState;

    // Reset counters based on new state
    if (newState === CircuitState.CLOSED) {
      this.failureCount = 0;
      this.successCount = 0;
      this.nextAttemptTime = undefined;
      
      this.logger.logInfo(
        `Circuit breaker CLOSED for ${this.serviceName}`,
        { previousState: oldState }
      );
    } else if (newState === CircuitState.OPEN) {
      this.successCount = 0;
      this.nextAttemptTime = new Date(Date.now() + this.config.timeout);
      
      this.logger.logWarning(
        `Circuit breaker OPEN for ${this.serviceName}`,
        {
          previousState: oldState,
          nextAttemptTime: this.nextAttemptTime,
          failureCount: this.failureCount
        }
      );
    } else if (newState === CircuitState.HALF_OPEN) {
      this.successCount = 0;
      this.failureCount = 0;
      
      this.logger.logInfo(
        `Circuit breaker HALF_OPEN for ${this.serviceName}`,
        { previousState: oldState }
      );
    }

    // Notify state change
    if (this.config.onStateChange) {
      this.config.onStateChange(newState);
    }
  }

  /**
   * Check if we should attempt to reset the circuit
   */
  private shouldAttemptReset(): boolean {
    return this.nextAttemptTime !== undefined && Date.now() >= this.nextAttemptTime.getTime();
  }

  /**
   * Get current circuit breaker statistics
   */
  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      totalRequests: this.totalRequests,
      totalFailures: this.totalFailures,
      totalSuccesses: this.totalSuccesses
    };
  }

  /**
   * Get current state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Check if circuit is available for requests
   */
  isAvailable(): boolean {
    return this.state === CircuitState.CLOSED || 
           (this.state === CircuitState.HALF_OPEN) ||
           (this.state === CircuitState.OPEN && this.shouldAttemptReset());
  }

  /**
   * Manually reset the circuit breaker
   */
  reset(): void {
    this.transitionTo(CircuitState.CLOSED);
  }

  /**
   * Manually open the circuit breaker
   */
  open(): void {
    this.transitionTo(CircuitState.OPEN);
  }

  /**
   * Validate configuration
   */
  private validateConfig(): void {
    if (this.config.failureThreshold < 1) {
      throw new Error('failureThreshold must be at least 1');
    }
    if (this.config.successThreshold < 1) {
      throw new Error('successThreshold must be at least 1');
    }
    if (this.config.timeout < 1000) {
      throw new Error('timeout must be at least 1000ms');
    }
  }
}
