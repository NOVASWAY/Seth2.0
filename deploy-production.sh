#!/bin/bash

# ===========================================
# SETH CLINIC CMS - PRODUCTION DEPLOYMENT SCRIPT
# ===========================================

set -e  # Exit on any error

echo "🚀 Starting Seth Clinic CMS Production Deployment..."
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if .env.production exists
if [ ! -f ".env.production" ]; then
    print_error ".env.production file not found!"
    print_status "Please create .env.production with your production secrets"
    print_status "You can use the template provided in the repository"
    exit 1
fi

# Check if required environment variables are set
print_status "Validating environment configuration..."

# Load environment variables
export $(cat .env.production | grep -v '^#' | xargs)

# Check critical variables
if [ -z "$JWT_SECRET" ] || [ "$JWT_SECRET" = "your-secret-key" ]; then
    print_error "JWT_SECRET must be set to a secure value"
    exit 1
fi

if [ -z "$POSTGRES_PASSWORD" ] || [ "$POSTGRES_PASSWORD" = "postgres123" ]; then
    print_error "POSTGRES_PASSWORD must be set to a secure value"
    exit 1
fi

if [ -z "$MONGODB_PASSWORD" ] || [ "$MONGODB_PASSWORD" = "admin123" ]; then
    print_error "MONGODB_PASSWORD must be set to a secure value"
    exit 1
fi

if [ -z "$ADMIN_EMAIL" ] || [ "$ADMIN_EMAIL" = "admin@yourdomain.com" ]; then
    print_error "ADMIN_EMAIL must be set to your actual admin email"
    exit 1
fi

print_success "Environment validation passed"

# Build the application
print_status "Building application..."
cd backend
npm run build
print_success "Application built successfully"

# Build Docker images
print_status "Building Docker images..."
cd ..
docker-compose -f docker-compose.yml -f docker-compose.prod.yml build
print_success "Docker images built successfully"

# Stop existing containers
print_status "Stopping existing containers..."
docker-compose -f docker-compose.yml -f docker-compose.prod.yml down
print_success "Existing containers stopped"

# Start production containers
print_status "Starting production containers..."
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
print_success "Production containers started"

# Wait for services to be healthy
print_status "Waiting for services to be healthy..."
sleep 30

# Check service health
print_status "Checking service health..."

# Check PostgreSQL
if docker-compose -f docker-compose.yml -f docker-compose.prod.yml exec -T postgres pg_isready -U ${POSTGRES_USER:-seth_clinic_user}; then
    print_success "PostgreSQL is healthy"
else
    print_error "PostgreSQL is not healthy"
    exit 1
fi

# Check Redis
if docker-compose -f docker-compose.yml -f docker-compose.prod.yml exec -T redis redis-cli --no-auth-warning -a ${REDIS_PASSWORD} ping | grep -q PONG; then
    print_success "Redis is healthy"
else
    print_error "Redis is not healthy"
    exit 1
fi

# Check MongoDB
if docker-compose -f docker-compose.yml -f docker-compose.prod.yml exec -T mongodb mongosh --eval "db.adminCommand('ping')" | grep -q "ok.*1"; then
    print_success "MongoDB is healthy"
else
    print_error "MongoDB is not healthy"
    exit 1
fi

# Check Backend API
if curl -f http://localhost:5000/health > /dev/null 2>&1; then
    print_success "Backend API is healthy"
else
    print_error "Backend API is not healthy"
    exit 1
fi

# Check Frontend
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    print_success "Frontend is healthy"
else
    print_error "Frontend is not healthy"
    exit 1
fi

# Run production tests
print_status "Running production tests..."
cd backend
NODE_ENV=production npx ts-node src/scripts/test-production-deployment.ts
print_success "Production tests passed"

# Show deployment summary
echo ""
echo "🎉 PRODUCTION DEPLOYMENT COMPLETED SUCCESSFULLY!"
echo "=================================================="
echo ""
print_success "All services are running and healthy"
print_success "Backend API: http://localhost:5000"
print_success "Frontend: http://localhost:3000"
print_success "Health Check: http://localhost:5000/health"
echo ""
print_status "Next steps:"
echo "1. Configure your domain and SSL certificates"
echo "2. Set up monitoring and alerting"
echo "3. Configure backup verification"
echo "4. Test all functionality thoroughly"
echo "5. Set up log aggregation"
echo ""
print_warning "Remember to:"
echo "- Keep your .env.production file secure"
echo "- Regularly rotate secrets"
echo "- Monitor system logs"
echo "- Test backups regularly"
echo ""
print_status "Deployment completed at: $(date)"
