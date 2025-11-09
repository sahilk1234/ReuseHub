import { CircuitBreaker, CircuitState, CircuitBreakerStats } from './CircuitBreaker';
import { ErrorLogger } from '@/api/errors/ErrorLogger';

/**
 * Service health status
 */
export interface ServiceHealth {
  serviceName: string;
  isHealthy: boolean;
  circuitState: CircuitState;
  stats: CircuitBreakerStats;
  lastCheck: Date;
}

/**
 * Health check result
 */
export interface HealthCheckResult {
  healthy: boolean;
  message?: string;
  responseTime?: number;
}

/**
 * Service Health Monitor
 * Monitors the health of external services and manages circuit breakers
 * Requirements: 3.1, 3.3, 3.5
 */
export class ServiceHealthMonitor {
  private static instance: ServiceHealthMonitor;
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private healthChecks: Map<string, () => Promise<HealthCheckResult>> = new Map();
  private monitoringInterval?: NodeJS.Timeout;
  private logger = ErrorLogger.getInstance();

  private constructor() {}

  static getInstance(): ServiceHealthMonitor {
    if (!ServiceHealthMonitor.instance) {
      ServiceHealthMonitor.instance = new ServiceHealthMonitor();
    }
    return ServiceHealthMonitor.instance;
  }

  /**
   * Register a circuit breaker for a service
   */
  registerCircuitBreaker(serviceName: string, circuitBreaker: CircuitBreaker): void {
    this.circuitBreakers.set(serviceName, circuitBreaker);
    this.logger.logInfo(`Circuit breaker registered for ${serviceName}`);
  }

  /**
   * Register a health check function for a service
   */
  registerHealthCheck(
    serviceName: string,
    healthCheck: () => Promise<HealthCheckResult>
  ): void {
    this.healthChecks.set(serviceName, healthCheck);
    this.logger.logInfo(`Health check registered for ${serviceName}`);
  }

  /**
   * Get circuit breaker for a service
   */
  getCircuitBreaker(serviceName: string): CircuitBreaker | undefined {
    return this.circuitBreakers.get(serviceName);
  }

  /**
   * Check health of a specific service
   */
  async checkServiceHealth(serviceName: string): Promise<ServiceHealth> {
    const circuitBreaker = this.circuitBreakers.get(serviceName);
    const healthCheck = this.healthChecks.get(serviceName);

    if (!circuitBreaker) {
      throw new Error(`No circuit breaker registered for ${serviceName}`);
    }

    const stats = circuitBreaker.getStats();
    let isHealthy = circuitBreaker.getState() === CircuitState.CLOSED;

    // Run health check if available
    if (healthCheck) {
      try {
        const result = await healthCheck();
        isHealthy = result.healthy && isHealthy;
      } catch (error) {
        isHealthy = false;
        this.logger.logWarning(
          `Health check failed for ${serviceName}`,
          { error: error instanceof Error ? error.message : 'Unknown error' }
        );
      }
    }

    return {
      serviceName,
      isHealthy,
      circuitState: stats.state,
      stats,
      lastCheck: new Date()
    };
  }

  /**
   * Check health of all registered services
   */
  async checkAllServices(): Promise<ServiceHealth[]> {
    const healthStatuses: ServiceHealth[] = [];

    for (const serviceName of this.circuitBreakers.keys()) {
      try {
        const health = await this.checkServiceHealth(serviceName);
        healthStatuses.push(health);
      } catch (error) {
        this.logger.logWarning(
          `Failed to check health for ${serviceName}`,
          { error: error instanceof Error ? error.message : 'Unknown error' }
        );
      }
    }

    return healthStatuses;
  }

  /**
   * Start periodic health monitoring
   */
  startMonitoring(intervalMs: number = 60000): void {
    if (this.monitoringInterval) {
      this.logger.logWarning('Health monitoring already started');
      return;
    }

    this.logger.logInfo(`Starting health monitoring (interval: ${intervalMs}ms)`);

    this.monitoringInterval = setInterval(async () => {
      const healthStatuses = await this.checkAllServices();
      
      const unhealthyServices = healthStatuses.filter(h => !h.isHealthy);
      if (unhealthyServices.length > 0) {
        this.logger.logWarning(
          'Unhealthy services detected',
          {
            count: unhealthyServices.length,
            services: unhealthyServices.map(s => ({
              name: s.serviceName,
              state: s.circuitState
            }))
          }
        );
      }
    }, intervalMs);
  }

  /**
   * Stop periodic health monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
      this.logger.logInfo('Health monitoring stopped');
    }
  }

  /**
   * Get overall system health
   */
  async getSystemHealth(): Promise<{
    healthy: boolean;
    services: ServiceHealth[];
    summary: {
      total: number;
      healthy: number;
      unhealthy: number;
    };
  }> {
    const services = await this.checkAllServices();
    const healthy = services.filter(s => s.isHealthy).length;
    const unhealthy = services.length - healthy;

    return {
      healthy: unhealthy === 0,
      services,
      summary: {
        total: services.length,
        healthy,
        unhealthy
      }
    };
  }

  /**
   * Reset a specific circuit breaker
   */
  resetCircuitBreaker(serviceName: string): void {
    const circuitBreaker = this.circuitBreakers.get(serviceName);
    if (circuitBreaker) {
      circuitBreaker.reset();
      this.logger.logInfo(`Circuit breaker reset for ${serviceName}`);
    }
  }

  /**
   * Reset all circuit breakers
   */
  resetAllCircuitBreakers(): void {
    for (const [serviceName, circuitBreaker] of this.circuitBreakers.entries()) {
      circuitBreaker.reset();
      this.logger.logInfo(`Circuit breaker reset for ${serviceName}`);
    }
  }

  /**
   * Get statistics for all services
   */
  getAllStats(): Map<string, CircuitBreakerStats> {
    const stats = new Map<string, CircuitBreakerStats>();
    
    for (const [serviceName, circuitBreaker] of this.circuitBreakers.entries()) {
      stats.set(serviceName, circuitBreaker.getStats());
    }

    return stats;
  }
}
