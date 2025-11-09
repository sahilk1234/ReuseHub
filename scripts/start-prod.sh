#!/bin/bash

# Start production environment with Docker Compose
echo "🚀 Starting Re:UseNet production environment..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please create one based on .env.example"
    exit 1
fi

# Start services
docker-compose up -d --build

echo "✅ Production environment started!"
echo "🌐 Application: http://localhost:${PORT:-3000}"

# Show logs
docker-compose logs -f app