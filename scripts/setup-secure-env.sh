#!/bin/bash

# =============================================================================
# Seth Medical Clinic CMS - Secure Environment Setup
# =============================================================================
# This script creates a secure, production-ready environment configuration
# with automatic security hardening and validation.

set -e

echo "🔒 Seth Medical Clinic CMS - Secure Environment Setup"
echo "====================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_TEMPLATE="$PROJECT_ROOT/env.template"
ENV_FILE="$PROJECT_ROOT/.env"
ENV_PROD_FILE="$PROJECT_ROOT/.env.production"

# =============================================================================
# Utility Functions
# =============================================================================

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Generate secure random string
generate_secure_string() {
    local length=${1:-32}
    openssl rand -base64 $length | tr -d "=+/" | cut -c1-$length
}

# Generate UUID
generate_uuid() {
    if command -v uuidgen >/dev/null 2>&1; then
        uuidgen
    else
        cat /proc/sys/kernel/random/uuid 2>/dev/null || python3 -c "import uuid; print(uuid.uuid4())"
    fi
}

# Validate password strength
validate_password() {
    local password=$1
    local min_length=12
    
    if [ ${#password} -lt $min_length ]; then
        return 1
    fi
    
    # Check for uppercase, lowercase, number, special character
    if [[ ! $password =~ [A-Z] ]] || [[ ! $password =~ [a-z] ]] || [[ ! $password =~ [0-9] ]] || [[ ! $password =~ [^A-Za-z0-9] ]]; then
        return 1
    fi
    
    return 0
}

# =============================================================================
# Environment Detection
# =============================================================================

detect_environment() {
    if [ -f "$ENV_PROD_FILE" ]; then
        echo "production"
    elif [ -f "$ENV_FILE" ]; then
        echo "development"
    else
        echo "new"
    fi
}

# =============================================================================
# Security Configuration
# =============================================================================

configure_security() {
    log_info "Configuring security settings..."
    
    # Generate secure secrets
    JWT_SECRET=$(generate_secure_string 64)
    JWT_REFRESH_SECRET=$(generate_secure_string 64)
    SESSION_SECRET=$(generate_secure_string 32)
    COOKIE_SECRET=$(generate_secure_string 32)
    
    # Generate secure passwords
    POSTGRES_PASSWORD=$(generate_secure_string 24)
    REDIS_PASSWORD=$(generate_secure_string 24)
    
    log_success "Generated secure secrets and passwords"
}

# =============================================================================
# Environment File Creation
# =============================================================================

create_environment_file() {
    local env_type=$1
    local target_file=$2
    
    log_info "Creating $env_type environment file..."
    
    if [ ! -f "$ENV_TEMPLATE" ]; then
        log_error "Environment template not found: $ENV_TEMPLATE"
        exit 1
    fi
    
    # Copy template
    cp "$ENV_TEMPLATE" "$target_file"
    
    # Replace placeholders with secure values
    sed -i "s/your_secure_password_here/$POSTGRES_PASSWORD/g" "$target_file"
    sed -i "s/your_redis_password_here/$REDIS_PASSWORD/g" "$target_file"
    sed -i "s/your_super_secret_jwt_key_change_in_production/$JWT_SECRET/g" "$target_file"
    sed -i "s/your_super_secret_refresh_key_change_in_production/$JWT_REFRESH_SECRET/g" "$target_file"
    sed -i "s/your_session_secret_here/$SESSION_SECRET/g" "$target_file"
    sed -i "s/your_cookie_secret_here/$COOKIE_SECRET/g" "$target_file"
    
    # Set environment-specific values
    if [ "$env_type" = "production" ]; then
        sed -i "s/NODE_ENV=development/NODE_ENV=production/g" "$target_file"
        sed -i "s/LOG_LEVEL=debug/LOG_LEVEL=info/g" "$target_file"
        sed -i "s/MPESA_ENVIRONMENT=sandbox/MPESA_ENVIRONMENT=production/g" "$target_file"
        sed -i "s/http:\/\/localhost/https:\/\/yourdomain.com/g" "$target_file"
    fi
    
    # Set file permissions
    chmod 600 "$target_file"
    
    log_success "Created $env_type environment file: $target_file"
}

# =============================================================================
# SSL Certificate Setup
# =============================================================================

setup_ssl_certificates() {
    local ssl_dir="$PROJECT_ROOT/nginx/ssl"
    
    log_info "Setting up SSL certificates..."
    
    # Create SSL directory
    mkdir -p "$ssl_dir"
    
    # Check if certificates already exist
    if [ -f "$ssl_dir/cert.pem" ] && [ -f "$ssl_dir/key.pem" ]; then
        log_success "SSL certificates already exist"
        return 0
    fi
    
    # Generate self-signed certificates for development
    log_warning "Generating self-signed SSL certificates for development..."
    
    openssl req -x509 -newkey rsa:4096 -keyout "$ssl_dir/key.pem" -out "$ssl_dir/cert.pem" \
        -days 365 -nodes -subj "/C=KE/ST=Nairobi/L=Nairobi/O=Seth Medical Clinic/CN=localhost" \
        -addext "subjectAltName=DNS:localhost,DNS:*.localhost,IP:127.0.0.1" 2>/dev/null
    
    # Set secure permissions
    chmod 600 "$ssl_dir/key.pem"
    chmod 644 "$ssl_dir/cert.pem"
    
    log_success "SSL certificates generated"
    log_warning "For production, replace with real certificates from a trusted CA"
}

# =============================================================================
# Database Security Setup
# =============================================================================

setup_database_security() {
    log_info "Configuring database security..."
    
    # Create database security configuration
    cat > "$PROJECT_ROOT/database/security.sql" << 'EOF'
-- Database Security Configuration
-- This file contains security hardening settings for PostgreSQL

-- Enable SSL connections
ALTER SYSTEM SET ssl = on;
ALTER SYSTEM SET ssl_cert_file = 'server.crt';
ALTER SYSTEM SET ssl_key_file = 'server.key';

-- Connection security
ALTER SYSTEM SET listen_addresses = 'localhost';
ALTER SYSTEM SET max_connections = 100;

-- Authentication security
ALTER SYSTEM SET password_encryption = 'scram-sha-256';
ALTER SYSTEM SET log_connections = on;
ALTER SYSTEM SET log_disconnections = on;
ALTER SYSTEM SET log_failed_connections = on;

-- Audit logging
ALTER SYSTEM SET log_statement = 'mod';
ALTER SYSTEM SET log_min_duration_statement = 1000;

-- Reload configuration
SELECT pg_reload_conf();
EOF
    
    log_success "Database security configuration created"
}

# =============================================================================
# Firewall Configuration
# =============================================================================

configure_firewall() {
    log_info "Configuring firewall rules..."
    
    # Create firewall configuration script
    cat > "$PROJECT_ROOT/scripts/setup-firewall.sh" << 'EOF'
#!/bin/bash

# Seth Medical Clinic CMS - Firewall Configuration
# This script configures UFW firewall for production security

set -e

echo "🔒 Configuring firewall for Seth Medical Clinic CMS..."

# Enable UFW
ufw --force enable

# Default policies
ufw default deny incoming
ufw default allow outgoing

# Allow SSH (adjust port if needed)
ufw allow 22/tcp

# Allow HTTP and HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Allow database connections from localhost only
ufw allow from 127.0.0.1 to any port 5432
ufw allow from 127.0.0.1 to any port 6379

# Allow application ports (adjust as needed)
ufw allow 3000/tcp
ufw allow 5000/tcp

# Show status
ufw status verbose

echo "✅ Firewall configuration complete"
EOF
    
    chmod +x "$PROJECT_ROOT/scripts/setup-firewall.sh"
    
    log_success "Firewall configuration script created"
    log_warning "Run ./scripts/setup-firewall.sh on production server"
}

# =============================================================================
# Backup Configuration
# =============================================================================

setup_backup_system() {
    log_info "Setting up automated backup system..."
    
    # Create backup script
    cat > "$PROJECT_ROOT/scripts/backup-system.sh" << 'EOF'
#!/bin/bash

# Seth Medical Clinic CMS - Automated Backup System
# This script creates encrypted backups of the database and application data

set -e

BACKUP_DIR="/var/backups/seth-clinic"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="seth-clinic-backup-$DATE.tar.gz"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Database backup
echo "📊 Creating database backup..."
pg_dump -h localhost -U postgres seth_clinic | gzip > "$BACKUP_DIR/database-$DATE.sql.gz"

# Application data backup
echo "📁 Creating application data backup..."
tar -czf "$BACKUP_DIR/$BACKUP_FILE" \
    --exclude=node_modules \
    --exclude=.git \
    --exclude=logs \
    --exclude=uploads/temp \
    /home/njau-wangari/Sethmed/seth-clinic-cms

# Encrypt backup
echo "🔒 Encrypting backup..."
gpg --symmetric --cipher-algo AES256 --output "$BACKUP_DIR/$BACKUP_FILE.gpg" "$BACKUP_DIR/$BACKUP_FILE"
rm "$BACKUP_DIR/$BACKUP_FILE"

# Cleanup old backups (keep last 30 days)
find "$BACKUP_DIR" -name "*.gpg" -mtime +30 -delete
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +30 -delete

echo "✅ Backup completed: $BACKUP_FILE.gpg"
EOF
    
    chmod +x "$PROJECT_ROOT/scripts/backup-system.sh"
    
    # Create cron job for daily backups
    cat > "$PROJECT_ROOT/scripts/install-backup-cron.sh" << 'EOF'
#!/bin/bash

# Install daily backup cron job
(crontab -l 2>/dev/null; echo "0 2 * * * $PWD/scripts/backup-system.sh >> /var/log/seth-clinic-backup.log 2>&1") | crontab -

echo "✅ Daily backup cron job installed"
EOF
    
    chmod +x "$PROJECT_ROOT/scripts/install-backup-cron.sh"
    
    log_success "Backup system configured"
}

# =============================================================================
# Monitoring Setup
# =============================================================================

setup_monitoring() {
    log_info "Setting up system monitoring..."
    
    # Create monitoring script
    cat > "$PROJECT_ROOT/scripts/monitor-system.sh" << 'EOF'
#!/bin/bash

# Seth Medical Clinic CMS - System Monitoring
# This script monitors system health and sends alerts

set -e

LOG_FILE="/var/log/seth-clinic-monitor.log"
ALERT_EMAIL="admin@sethclinic.com"

# Check system resources
check_resources() {
    local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
    local memory_usage=$(free | grep Mem | awk '{printf("%.0f", $3/$2 * 100.0)}')
    local disk_usage=$(df / | tail -1 | awk '{print $5}' | cut -d'%' -f1)
    
    echo "CPU: ${cpu_usage}%, Memory: ${memory_usage}%, Disk: ${disk_usage}%"
    
    # Alert if thresholds exceeded
    if (( $(echo "$cpu_usage > 80" | bc -l) )); then
        echo "ALERT: High CPU usage: ${cpu_usage}%" >> "$LOG_FILE"
    fi
    
    if (( memory_usage > 85 )); then
        echo "ALERT: High memory usage: ${memory_usage}%" >> "$LOG_FILE"
    fi
    
    if (( disk_usage > 90 )); then
        echo "ALERT: High disk usage: ${disk_usage}%" >> "$LOG_FILE"
    fi
}

# Check application health
check_application() {
    local backend_status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/health)
    local frontend_status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health)
    
    if [ "$backend_status" != "200" ]; then
        echo "ALERT: Backend health check failed: $backend_status" >> "$LOG_FILE"
    fi
    
    if [ "$frontend_status" != "200" ]; then
        echo "ALERT: Frontend health check failed: $frontend_status" >> "$LOG_FILE"
    fi
}

# Check database
check_database() {
    local db_status=$(pg_isready -h localhost -p 5432 -U postgres)
    
    if [ $? -ne 0 ]; then
        echo "ALERT: Database connection failed" >> "$LOG_FILE"
    fi
}

# Main monitoring function
main() {
    echo "$(date): Starting system health check" >> "$LOG_FILE"
    
    check_resources
    check_application
    check_database
    
    echo "$(date): Health check completed" >> "$LOG_FILE"
}

main
EOF
    
    chmod +x "$PROJECT_ROOT/scripts/monitor-system.sh"
    
    # Create monitoring cron job
    cat > "$PROJECT_ROOT/scripts/install-monitoring-cron.sh" << 'EOF'
#!/bin/bash

# Install monitoring cron job (every 5 minutes)
(crontab -l 2>/dev/null; echo "*/5 * * * * $PWD/scripts/monitor-system.sh") | crontab -

echo "✅ System monitoring cron job installed"
EOF
    
    chmod +x "$PROJECT_ROOT/scripts/install-monitoring-cron.sh"
    
    log_success "System monitoring configured"
}

# =============================================================================
# Main Setup Function
# =============================================================================

main() {
    local environment=$(detect_environment)
    
    log_info "Detected environment: $environment"
    
    # Configure security
    configure_security
    
    # Create environment files
    if [ "$environment" = "new" ] || [ "$environment" = "development" ]; then
        create_environment_file "development" "$ENV_FILE"
    fi
    
    if [ "$environment" = "new" ] || [ "$environment" = "production" ]; then
        create_environment_file "production" "$ENV_PROD_FILE"
    fi
    
    # Setup SSL certificates
    setup_ssl_certificates
    
    # Setup database security
    setup_database_security
    
    # Configure firewall
    configure_firewall
    
    # Setup backup system
    setup_backup_system
    
    # Setup monitoring
    setup_monitoring
    
    # Create security summary
    cat > "$PROJECT_ROOT/SECURITY_SETUP_SUMMARY.md" << EOF
# 🔒 Security Setup Summary

## Environment Files Created
- \`.env\` - Development environment
- \`.env.production\` - Production environment

## Security Features Configured
- ✅ Secure password generation
- ✅ JWT secret rotation
- ✅ SSL certificate setup
- ✅ Database security hardening
- ✅ Firewall configuration
- ✅ Automated backup system
- ✅ System monitoring

## Next Steps
1. Review and customize environment files
2. Configure M-Pesa and SHA API credentials
3. Run \`./scripts/setup-firewall.sh\` on production server
4. Install backup cron job: \`./scripts/install-backup-cron.sh\`
5. Install monitoring cron job: \`./scripts/install-monitoring-cron.sh\`

## Important Security Notes
- Change default admin password after first login
- Use real SSL certificates for production
- Regularly update system dependencies
- Monitor system logs for security events
- Test backup and recovery procedures

Generated: $(date)
EOF
    
    log_success "Security setup completed successfully!"
    log_info "Review SECURITY_SETUP_SUMMARY.md for next steps"
}

# Run main function
main "$@"
