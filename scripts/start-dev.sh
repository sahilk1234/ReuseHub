#!/bin/bash

# Start development environment with Docker Compose
echo "🚀 Starting Re:UseNet development environment..."

# Check if .env file exists, if not copy from example
if [ ! -f .env ]; then
    echo "📝 Creating .env file from .env.example..."
    cp .env.example .env
    echo "⚠️  Please update .env file with your configuration before running again"
    exit 1
fi

# Start services
docker-compose -f docker-compose.dev.yml up --build

echo "✅ Development environment started!"
echo "🌐 Application: http://localhost:3000"
echo "🗄️  Database: localhost:5432"
echo "🔴 Redis: localhost:6379"