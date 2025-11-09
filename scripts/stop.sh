#!/bin/bash

# Stop all Docker Compose services
echo "🛑 Stopping Re:UseNet services..."

# Stop development services
if [ -f docker-compose.dev.yml ]; then
    docker-compose -f docker-compose.dev.yml down
fi

# Stop production services
if [ -f docker-compose.yml ]; then
    docker-compose down
fi

echo "✅ All services stopped!"