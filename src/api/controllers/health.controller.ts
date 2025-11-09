import { Request, Response, NextFunction } from 'express';
import { ServiceHealthMonitor } from '@/infrastructure/resilience/ServiceHealthMonitor';

/**
 * Health Check Controller
 * Provides endpoints for monitoring service health and circuit breaker status
 */
export class HealthController {
  private healthMonitor = ServiceHealthMonitor.getInstance();

  /**
   * Get overall system health
   */
  async getSystemHealth(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const health = await this.healthMonitor.getSystemHealth();
      
      const statusCode = health.healthy ? 200 : 503;
      
      res.status(statusCode).json({
        status: health.healthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        services: health.services.map(service => ({
          name: service.serviceName,
          healthy: service.isHealthy,
          circuitState: service.circuitState,
          lastCheck: service.lastCheck
        })),
        summary: health.summary
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get health of a specific service
   */
  async getServiceHealth(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const serviceName = req.params.serviceName;
      
      if (!serviceName) {
        res.status(400).json({
          error: {
            code: 'INVALID_REQUEST',
            message: 'Service name is required'
          }
        });
        return;
      }

      const health = await this.healthMonitor.checkServiceHealth(serviceName);
      
      res.json({
        service: {
          name: health.serviceName,
          healthy: health.isHealthy,
          circuitState: health.circuitState,
          stats: health.stats,
          lastCheck: health.lastCheck
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get circuit breaker statistics for all services
   */
  async getCircuitBreakerStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = this.healthMonitor.getAllStats();
      
      const statsArray = Array.from(stats.entries()).map(([serviceName, stat]) => ({
        serviceName,
        ...stat
      }));

      res.json({
        timestamp: new Date().toISOString(),
        services: statsArray
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reset a specific circuit breaker (admin endpoint)
   */
  async resetCircuitBreaker(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const serviceName = req.params.serviceName;
      
      if (!serviceName) {
        res.status(400).json({
          error: {
            code: 'INVALID_REQUEST',
            message: 'Service name is required'
          }
        });
        return;
      }

      this.healthMonitor.resetCircuitBreaker(serviceName);
      
      res.json({
        message: `Circuit breaker reset for ${serviceName}`,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reset all circuit breakers (admin endpoint)
   */
  async resetAllCircuitBreakers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      this.healthMonitor.resetAllCircuitBreakers();
      
      res.json({
        message: 'All circuit breakers reset',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }
}
