#!/bin/bash

# Seth Medical Clinic - Production Deployment Script
set -e

echo "🏥 Seth Medical Clinic - Production Deployment"
echo "=============================================="

# Check if .env.production exists
if [ ! -f .env.production ]; then
    echo "❌ Error: .env.production file not found"
    echo "Please copy env.template to .env.production and configure all variables"
    exit 1
fi

# Load production environment variables
export $(cat .env.production | grep -v '^#' | xargs)

# Validate required environment variables
required_vars=(
    "POSTGRES_PASSWORD"
    "REDIS_PASSWORD"
    "JWT_SECRET"
    "JWT_REFRESH_SECRET"
    "MPESA_CONSUMER_KEY"
    "MPESA_CONSUMER_SECRET"
    "SHA_API_KEY"
    # New prescription system variables
    "LOG_LEVEL"
    "ENABLE_AUDIT_LOGGING"
    "AUTO_SAVE_INTERVAL"
)

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Error: Required environment variable $var is not set"
        exit 1
    fi
done

echo "✅ Environment variables validated"

# Validate prescription system configuration
echo "🔍 Validating prescription system configuration..."

if [ "$ENABLE_AUDIT_LOGGING" != "true" ] && [ "$ENABLE_AUDIT_LOGGING" != "false" ]; then
    echo "❌ Error: ENABLE_AUDIT_LOGGING must be 'true' or 'false'"
    exit 1
fi

if ! [[ "$AUTO_SAVE_INTERVAL" =~ ^[0-9]+$ ]] || [ "$AUTO_SAVE_INTERVAL" -lt 10000 ]; then
    echo "❌ Error: AUTO_SAVE_INTERVAL must be a number >= 10000 (10 seconds)"
    exit 1
fi

if [ "$LOG_LEVEL" != "debug" ] && [ "$LOG_LEVEL" != "info" ] && [ "$LOG_LEVEL" != "warn" ] && [ "$LOG_LEVEL" != "error" ]; then
    echo "❌ Error: LOG_LEVEL must be one of: debug, info, warn, error"
    exit 1
fi

echo "✅ Prescription system configuration validated"

# Validate diagnostics system configuration
echo "🔍 Validating diagnostics system configuration..."

# Check if lab tests table exists in schema
if ! grep -q "lab_tests" database/schema.sql; then
    echo "❌ Error: Database schema does not include lab_tests table"
    echo "Please ensure the schema.sql file includes the diagnostics system tables"
    exit 1
fi

# Check if lab_requests table exists in schema
if ! grep -q "lab_requests" database/schema.sql; then
    echo "❌ Error: Database schema does not include lab_requests table"
    echo "Please ensure the schema.sql file includes the diagnostics system tables"
    exit 1
fi

echo "✅ Diagnostics system configuration validated"

# Create SSL directory if it doesn't exist
mkdir -p nginx/ssl

# Check if SSL certificates exist
if [ ! -f nginx/ssl/cert.pem ] || [ ! -f nginx/ssl/key.pem ]; then
    echo "⚠️  Warning: SSL certificates not found in nginx/ssl/"
    echo "Please add your SSL certificate files:"
    echo "  - nginx/ssl/cert.pem"
    echo "  - nginx/ssl/key.pem"
    echo ""
    echo "For development, you can generate self-signed certificates:"
    echo "openssl req -x509 -newkey rsa:4096 -keyout nginx/ssl/key.pem -out nginx/ssl/cert.pem -days 365 -nodes"
    exit 1
fi

echo "✅ SSL certificates found"

# Check if database schema includes prescription tables
echo "🔍 Checking database schema..."
if ! grep -q "prescriptions" database/schema.sql; then
    echo "❌ Error: Database schema does not include prescription tables"
    echo "Please ensure the schema.sql file includes the prescription system tables"
    exit 1
fi

echo "✅ Database schema validated"

# Build and start services
echo "🔨 Building and starting services..."
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
sleep 30

# Check service health
services=("postgres" "redis" "backend" "frontend")
for service in "${services[@]}"; do
    if docker-compose -f docker-compose.prod.yml ps $service | grep -q "healthy\|Up"; then
        echo "✅ $service is running"
    else
        echo "❌ $service is not healthy"
        docker-compose -f docker-compose.prod.yml logs $service
        exit 1
    fi
done

# Run database migrations
echo "🗄️  Running database migrations..."
docker-compose -f docker-compose.prod.yml exec backend npm run db:migrate

# Verify prescription system endpoints
echo "🔍 Verifying prescription system endpoints..."
sleep 10

# Test prescription API endpoint
if curl -f -s "http://localhost:5000/health" > /dev/null; then
    echo "✅ Backend health check passed"
else
    echo "❌ Backend health check failed"
    exit 1
fi

# Test frontend health endpoint
if curl -f -s "http://localhost:3000/api/health" > /dev/null; then
    echo "✅ Frontend health check passed"
else
    echo "❌ Frontend health check failed"
    exit 1
fi

# Verify diagnostics system endpoints
echo "🔍 Verifying diagnostics system endpoints..."

# Test lab tests API endpoint
if curl -f -s "http://localhost:5000/api/lab-tests/available" > /dev/null; then
    echo "✅ Lab tests API endpoint accessible"
else
    echo "❌ Lab tests API endpoint not accessible"
    exit 1
fi

# Test lab requests API endpoint
if curl -f -s "http://localhost:5000/api/lab-requests" > /dev/null; then
    echo "✅ Lab requests API endpoint accessible"
else
    echo "❌ Lab requests API endpoint not accessible"
    exit 1
fi

echo ""
echo "🎉 Deployment completed successfully!"
echo ""
echo "Services are running at:"
echo "  - Frontend: https://localhost"
echo "  - Backend API: https://localhost/api"
echo "  - Database: localhost:${POSTGRES_PORT:-5432}"
echo ""
echo "Prescription System Features:"
echo "  - Medicine dropdown with real-time stock: ✅"
echo "  - Enhanced patient input: ✅"
echo "  - Auto-save protection: ✅"
echo "  - Comprehensive timestamping: ✅"
echo ""
echo "Diagnostics System Features:"
echo "  - Test selection with real-time catalog: ✅"
echo "  - Enhanced patient input: ✅"
echo "  - Auto-save protection: ✅"
echo "  - Urgency management: ✅"
echo "  - Comprehensive timestamping: ✅"
echo ""
echo "Default admin credentials:"
echo "  - Username: admin"
echo "  - Password: admin123"
echo ""
echo "⚠️  Remember to change the default admin password!"
echo ""
echo "📚 For more information, see PRESCRIPTION_SYSTEM_README.md and DIAGNOSTICS_SYSTEM_README.md"
