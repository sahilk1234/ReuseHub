# Resilience Patterns

This directory contains resilience patterns for handling external service failures.

## Overview

The resilience system provides:
- Circuit breaker pattern for fault tolerance
- Service health monitoring
- Automatic recovery mechanisms
- Fallback strategies
- Health check endpoints

## Circuit Breaker Pattern

The circuit breaker prevents cascading failures by stopping requests to failing services.

### States

1. **CLOSED** - Normal operation, requests pass through
2. **OPEN** - Service failing, requests rejected immediately
3. **HALF_OPEN** - Testing if service recovered

### Configuration

```typescript
import { CircuitBreaker } from '@/infrastructure/resilience';

const circuitBreaker = new CircuitBreaker('ServiceName', {
  failureThreshold: 5,      // Open after 5 failures
  successThreshold: 2,      // Close after 2 successes in half-open
  timeout: 60000,           // Wait 60s before trying again
  onStateChange: (state) => {
    console.log(`Circuit breaker state: ${state}`);
  }
});
```

### Usage

```typescript
// Execute function with circuit breaker protection
try {
  const result = await circuitBreaker.execute(async () => {
    return await externalService.call();
  });
} catch (error) {
  // Handle error or use fallback
  return fallbackValue;
}
```

## Service Health Monitor

Monitors the health of all external services and manages circuit breakers.

### Registration

```typescript
import { ServiceHealthMonitor } from '@/infrastructure/resilience';

const monitor = ServiceHealthMonitor.getInstance();

// Register circuit breaker
monitor.registerCircuitBreaker('AIService', circuitBreaker);

// Register health check
monitor.registerHealthCheck('AIService', async () => {
  const available = await aiService.isAvailable();
  return {
    healthy: available,
    message: available ? 'Service available' : 'Service unavailable'
  };
});
```

### Monitoring

```typescript
// Start periodic health monitoring (every 60 seconds)
monitor.startMonitoring(60000);

// Check specific service
const health = await monitor.checkServiceHealth('AIService');

// Check all services
const systemHealth = await monitor.getSystemHealth();

// Stop monitoring
monitor.stopMonitoring();
```

## Resilient AI Service

The `ResilientAIService` wraps the AI service with circuit breaker protection and fallback mechanisms.

### Features

- Circuit breaker for fault tolerance
- Automatic fallback to manual categorization
- Health monitoring integration
- Graceful degradation

### Usage

```typescript
import { ResilientAIService } from '@/infrastructure/services/adapters/ResilientAIService';
import { OpenAIService } from '@/infrastructure/services/adapters/OpenAIService';

const openAIService = new OpenAIService(config);
const resilientAI = new ResilientAIService(openAIService, {
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 60000
});

// Use like normal AI service - failures handled automatically
const result = await resilientAI.categorizeItem(description);
```

### Fallback Strategies

When AI service is unavailable:

1. **Image Analysis** - Returns basic placeholder
2. **Categorization** - Uses keyword matching
3. **Tag Generation** - Extracts keywords from description
4. **Similarity Search** - Uses simple text matching

## Health Check Endpoints

### GET /health
Overall system health status

Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "services": [
    {
      "name": "AIService",
      "healthy": true,
      "circuitState": "CLOSED",
      "lastCheck": "2024-01-01T12:00:00.000Z"
    }
  ],
  "summary": {
    "total": 1,
    "healthy": 1,
    "unhealthy": 0
  }
}
```

### GET /health/:serviceName
Specific service health

### GET /health/circuit-breakers
Circuit breaker statistics

### POST /health/circuit-breakers/:serviceName/reset
Reset specific circuit breaker (admin)

### POST /health/circuit-breakers/reset-all
Reset all circuit breakers (admin)

## Best Practices

1. **Configure Thresholds** - Set appropriate failure/success thresholds
2. **Implement Fallbacks** - Always provide fallback mechanisms
3. **Monitor Health** - Enable periodic health monitoring
4. **Log State Changes** - Track circuit breaker state transitions
5. **Test Failures** - Regularly test failure scenarios
6. **Set Timeouts** - Use reasonable timeout values
7. **Handle Gracefully** - Degrade gracefully when services fail

## Integration

The resilience system integrates with:
- Error handling system
- Logging system
- Health check endpoints
- External services (AI, Maps, Storage, etc.)
- Monitoring dashboards

## Requirements

Implements requirements:
- 3.1 - AI-powered item categorization with resilience
- 3.3 - Similarity search with fallback
- 3.5 - Learning from exchanges with fault tolerance
