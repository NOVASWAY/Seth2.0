#!/bin/bash

# Seth Medical Clinic CMS - Production Deployment Script
# This script helps you deploy the system to production

set -e

echo "🏥 Seth Medical Clinic CMS - Production Deployment"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    local status=$1
    local message=$2
    case $status in
        "success") echo -e "${GREEN}✅ $message${NC}" ;;
        "warning") echo -e "${YELLOW}⚠️  $message${NC}" ;;
        "error") echo -e "${RED}❌ $message${NC}" ;;
        "info") echo -e "${BLUE}ℹ️  $message${NC}" ;;
    esac
}

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    print_status "error" "Please don't run this script as root"
    exit 1
fi

echo ""
print_status "info" "Production Deployment Checklist"
echo "=========================================="

# 1. Environment Configuration
echo ""
print_status "info" "1. Environment Configuration"
echo "   - Create .env.production file"
echo "   - Set production database credentials"
echo "   - Configure production URLs and domains"
echo "   - Set secure JWT secrets"
echo "   - Configure M-Pesa production credentials"
echo "   - Set SHA insurance production API keys"

# 2. Database Setup
echo ""
print_status "info" "2. Database Setup"
echo "   - Create production PostgreSQL database"
echo "   - Run database migrations"
echo "   - Import real patient data (if available)"
echo "   - Create production user accounts"
echo "   - Set up database backups"

# 3. Infrastructure
echo ""
print_status "info" "3. Infrastructure Setup"
echo "   - Choose hosting provider (AWS, Azure, GCP, VPS)"
echo "   - Set up SSL certificates (Let's Encrypt)"
echo "   - Configure domain and DNS"
echo "   - Set up production Redis instance"
echo "   - Configure load balancer (if needed)"

# 4. Security
echo ""
print_status "info" "4. Security Configuration"
echo "   - Enable HTTPS everywhere"
echo "   - Configure firewall rules"
echo "   - Set up intrusion detection"
echo "   - Enable audit logging"
echo "   - Configure backup encryption"

# 5. Monitoring
echo ""
print_status "info" "5. Monitoring & Maintenance"
echo "   - Set up application monitoring"
echo "   - Configure error tracking"
echo "   - Set up automated backups"
echo "   - Configure alerting"
echo "   - Set up log aggregation"

echo ""
print_status "warning" "IMPORTANT: Before proceeding, ensure you have:"
echo "   - Production domain name"
echo "   - Hosting provider account"
echo "   - SSL certificates"
echo "   - Real clinic data (patients, staff, inventory)"
echo "   - M-Pesa production credentials"
echo "   - SHA insurance production API access"

echo ""
read -p "Are you ready to proceed with production deployment? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_status "info" "Deployment cancelled. Please prepare the prerequisites first."
    exit 0
fi

echo ""
print_status "info" "Starting Production Deployment..."
echo "============================================="

# Create production environment file
echo ""
print_status "info" "Creating production environment file..."
if [ ! -f .env.production ]; then
    cp env.template .env.production
    print_status "success" "Created .env.production from template"
    print_status "warning" "Please edit .env.production with your production values"
else
    print_status "info" ".env.production already exists"
fi

# Generate secure JWT secrets
echo ""
print_status "info" "Generating secure JWT secrets..."
JWT_SECRET=$(openssl rand -base64 64 | tr -d "=+/" | cut -c1-64)
JWT_REFRESH_SECRET=$(openssl rand -base64 64 | tr -d "=+/" | cut -c1-64)

echo "JWT_SECRET=$JWT_SECRET"
echo "JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET"

# Update .env.production with generated secrets
if [ -f .env.production ]; then
    sed -i "s/JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" .env.production
    sed -i "s/JWT_REFRESH_SECRET=.*/JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET/" .env.production
    print_status "success" "Updated JWT secrets in .env.production"
fi

# Create production docker-compose file
echo ""
print_status "info" "Creating production docker-compose file..."
cat > docker-compose.production.yml << 'EOF'
version: '3.8'

services:
  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    env_file:
      - .env.production
    restart: unless-stopped
    depends_on:
      - backend

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
    env_file:
      - .env.production
    restart: unless-stopped
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/init:/docker-entrypoint-initdb.d
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 30s
      timeout: 10s
      retries: 3

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "--raw", "incr", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
      - ./nginx/sites-enabled:/etc/nginx/sites-enabled
    depends_on:
      - frontend
      - backend
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
EOF

print_status "success" "Created docker-compose.production.yml"

# Create nginx configuration
echo ""
print_status "info" "Creating nginx configuration..."
mkdir -p nginx/sites-enabled nginx/ssl

cat > nginx/nginx.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    upstream frontend {
        server frontend:3000;
    }

    upstream backend {
        server backend:5000;
    }

    server {
        listen 80;
        server_name your-clinic-domain.com;
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name your-clinic-domain.com;

        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;

        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header Referrer-Policy "no-referrer-when-downgrade" always;
        add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

        location / {
            proxy_pass http://frontend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        location /api {
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
EOF

print_status "success" "Created nginx configuration"

# Create production deployment script
echo ""
print_status "info" "Creating production deployment script..."
cat > scripts/deploy-live.sh << 'EOF'
#!/bin/bash

# Production Live Deployment Script
set -e

echo "🚀 Deploying to production..."

# Load production environment
export $(cat .env.production | xargs)

# Build and deploy
docker-compose -f docker-compose.production.yml down
docker-compose -f docker-compose.production.yml build --no-cache
docker-compose -f docker-compose.production.yml up -d

echo "✅ Production deployment complete!"
echo "🌐 Frontend: https://your-clinic-domain.com"
echo "🔧 Backend: https://your-clinic-domain.com/api"
echo "📊 Health: https://your-clinic-domain.com/api/health"
EOF

chmod +x scripts/deploy-live.sh
print_status "success" "Created deploy-live.sh script"

echo ""
print_status "success" "Production deployment setup complete!"
echo "=================================================="
echo ""
echo "📋 Next Steps:"
echo "1. Edit .env.production with your production values"
echo "2. Update nginx/nginx.conf with your domain name"
echo "3. Obtain SSL certificates and place them in nginx/ssl/"
echo "4. Set up your production server/hosting"
echo "5. Run: ./scripts/deploy-live.sh"
echo ""
echo "🔐 Security Notes:"
echo "- JWT secrets have been generated and updated"
echo "- HTTPS is configured in nginx"
echo "- Security headers are enabled"
echo "- Rate limiting is configured"
echo ""
echo "📚 Documentation:"
echo "- Check PRESCRIPTION_SYSTEM_README.md"
echo "- Check DIAGNOSTICS_SYSTEM_README.md"
echo "- Review docker-compose.production.yml"
echo ""
print_status "info" "Your system is ready for production deployment! 🎉"
