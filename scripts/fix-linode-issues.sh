#!/bin/bash

echo "🔧 Fixing Linode Issues..."
echo "=========================="

# Stop all containers
echo "🛑 Stopping all containers..."
docker-compose down -v

# Clean up Docker
echo "🧹 Cleaning up Docker..."
docker system prune -f
docker volume prune -f

# Install Docker Compose if needed
if ! command -v docker-compose &> /dev/null; then
    echo "📦 Installing Docker Compose..."
    chmod +x scripts/install-docker-compose.sh
    ./scripts/install-docker-compose.sh
fi

# Fix permissions
echo "🔐 Fixing permissions..."
sudo chown -R $USER:$USER .
chmod -R 755 .

# Install missing dependencies
echo "📦 Installing missing dependencies..."
npm install --legacy-peer-deps
cd backend && npm install && cd ..

# Build containers with no cache
echo "🔨 Building containers..."
docker-compose build --no-cache

# Start services
echo "🚀 Starting services..."
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 30

# Check service status
echo "🔍 Checking service status..."
docker-compose ps

# Check logs for any remaining issues
echo "📋 Checking logs..."
docker-compose logs backend
docker-compose logs worker
docker-compose logs frontend

echo "✅ Fix script completed!"
echo "Access your application at: http://localhost:3000"
