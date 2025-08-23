#!/bin/bash

# Seth Medical Clinic - Production Deployment Script
# This script deploys the application to production

set -e

echo "🏥 Deploying Seth Medical Clinic to Production..."

# Check if production environment file exists
if [ ! -f .env.production ]; then
    echo "❌ .env.production file not found. Please create it from .env.production.example"
    exit 1
fi

# Backup current deployment
echo "💾 Creating backup of current deployment..."
./scripts/backup.sh

# Pull latest changes (if using git)
if [ -d ".git" ]; then
    echo "📥 Pulling latest changes..."
    git pull origin main
fi

# Build production images
echo "🏗️  Building production images..."
docker-compose -f docker-compose.prod.yml build

# Stop current services
echo "🛑 Stopping current services..."
docker-compose -f docker-compose.prod.yml down

# Start new services
echo "🚀 Starting production services..."
docker-compose -f docker-compose.prod.yml up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 30

# Run health checks
echo "🔍 Running health checks..."
if curl -f http://localhost/api/health > /dev/null 2>&1; then
    echo "✅ Backend health check passed"
else
    echo "❌ Backend health check failed"
    exit 1
fi

if curl -f http://localhost > /dev/null 2>&1; then
    echo "✅ Frontend health check passed"
else
    echo "❌ Frontend health check failed"
    exit 1
fi

echo "✅ Production deployment complete!"
echo "🌐 Application is available at your configured domain"
