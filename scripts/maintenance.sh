#!/bin/bash

# Seth Medical Clinic - Maintenance Script
# This script performs routine maintenance tasks

set -e

echo "🔧 Running maintenance tasks for Seth Medical Clinic..."

# Create backup
echo "💾 Creating backup..."
./scripts/backup.sh

# Clean up old logs (keep last 30 days)
echo "🧹 Cleaning up old logs..."
find logs -name "*.log" -mtime +30 -delete 2>/dev/null || true

# Clean up old backups (keep last 7 days)
echo "🧹 Cleaning up old backups..."
find backups -name "*.sql" -mtime +7 -delete 2>/dev/null || true

# Update inventory expiry status
echo "📦 Updating inventory expiry status..."
docker-compose exec backend npm run update-expiry

# Generate daily reports
echo "📊 Generating daily reports..."
docker-compose exec backend npm run generate-reports

# Check disk space
echo "💽 Checking disk space..."
df -h

# Check service health
echo "🔍 Checking service health..."
docker-compose ps

echo "✅ Maintenance tasks completed!"
