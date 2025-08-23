#!/bin/bash

# =============================================================================
# Seth Medical Clinic CMS - Production Update Script
# =============================================================================
# Safely update a live production system with zero downtime
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
BACKUP_DIR="./backups/$(date +%Y%m%d_%H%M%S)"
MAINTENANCE_FILE="./maintenance.flag"
UPDATE_LOG="./logs/update_$(date +%Y%m%d_%H%M%S).log"

# Create directories if they don't exist
mkdir -p $(dirname "$BACKUP_DIR")
mkdir -p $(dirname "$UPDATE_LOG")

# Function to log messages
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$UPDATE_LOG"
}

# Function to print status
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
        log "SUCCESS: $2"
    else
        echo -e "${RED}❌ $2${NC}"
        log "ERROR: $2"
        exit 1
    fi
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
    log "WARNING: $1"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
    log "INFO: $1"
}

# Function to check if system is healthy
check_system_health() {
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -sf http://localhost:5000/health >/dev/null 2>&1; then
            return 0
        fi
        echo "Health check attempt $attempt/$max_attempts failed, waiting..."
        sleep 2
        ((attempt++))
    done
    
    return 1
}

# Function to enable maintenance mode
enable_maintenance_mode() {
    print_info "Enabling maintenance mode..."
    
    # Create maintenance flag file
    echo "$(date): Maintenance mode enabled for system update" > "$MAINTENANCE_FILE"
    
    # Update frontend to show maintenance message
    if [ -f "app/maintenance-mode.js" ]; then
        node app/maintenance-mode.js enable
    fi
    
    print_status 0 "Maintenance mode enabled"
}

# Function to disable maintenance mode
disable_maintenance_mode() {
    print_info "Disabling maintenance mode..."
    
    # Remove maintenance flag file
    rm -f "$MAINTENANCE_FILE"
    
    # Update frontend to remove maintenance message
    if [ -f "app/maintenance-mode.js" ]; then
        node app/maintenance-mode.js disable
    fi
    
    print_status 0 "Maintenance mode disabled"
}

# Function to create backup
create_backup() {
    print_info "Creating system backup..."
    
    # Create backup directory
    mkdir -p "$BACKUP_DIR"
    
    # Backup database
    print_info "Backing up database..."
    docker compose exec postgres pg_dump -U postgres seth_clinic > "$BACKUP_DIR/database.sql"
    print_status $? "Database backup created"
    
    # Backup uploads
    if [ -d "./uploads" ]; then
        print_info "Backing up uploads..."
        cp -r ./uploads "$BACKUP_DIR/"
        print_status $? "Uploads backup created"
    fi
    
    # Backup configuration
    print_info "Backing up configuration..."
    cp .env "$BACKUP_DIR/" 2>/dev/null || true
    cp docker-compose.yml "$BACKUP_DIR/"
    cp docker-compose.prod.yml "$BACKUP_DIR/" 2>/dev/null || true
    print_status 0 "Configuration backup created"
    
    # Create backup manifest
    cat > "$BACKUP_DIR/manifest.txt" << EOF
Backup created: $(date)
Git commit: $(git rev-parse HEAD)
Git branch: $(git branch --show-current)
System version: $(cat package.json | grep version | head -1 | cut -d'"' -f4)
EOF
    
    print_status 0 "Complete backup created at $BACKUP_DIR"
}

# Function to test database migrations
test_migrations() {
    print_info "Testing database migrations..."
    
    # Check if there are pending migrations
    cd backend
    
    # Test migration (dry run)
    if npm run migrate:check 2>/dev/null; then
        print_status 0 "No pending migrations"
    else
        print_info "Pending migrations found, testing..."
        
        # Create test database for migration testing
        docker compose exec postgres createdb -U postgres seth_clinic_test 2>/dev/null || true
        
        # Test migration on test database
        DATABASE_URL="postgresql://postgres:$(grep POSTGRES_PASSWORD .env | cut -d'=' -f2)@localhost:5432/seth_clinic_test" npm run migrate
        
        if [ $? -eq 0 ]; then
            print_status 0 "Migration test successful"
            # Clean up test database
            docker compose exec postgres dropdb -U postgres seth_clinic_test 2>/dev/null || true
        else
            print_status 1 "Migration test failed"
        fi
    fi
    
    cd ..
}

# Function to update system
update_system() {
    local update_type="$1"
    
    case "$update_type" in
        "rolling")
            update_rolling
            ;;
        "maintenance")
            update_with_maintenance
            ;;
        "blue-green")
            update_blue_green
            ;;
        *)
            print_warning "Unknown update type: $update_type"
            print_info "Available types: rolling, maintenance, blue-green"
            exit 1
            ;;
    esac
}

# Rolling update (zero downtime for compatible changes)
update_rolling() {
    print_info "Starting rolling update..."
    
    # Pull latest code
    git fetch origin
    git checkout main
    git pull origin main
    
    # Update backend first
    print_info "Updating backend..."
    docker compose build backend
    docker compose up -d --no-deps backend
    
    # Wait for backend health check
    print_info "Waiting for backend health check..."
    sleep 10
    check_system_health
    print_status $? "Backend update completed"
    
    # Update worker
    print_info "Updating worker..."
    docker compose up -d --no-deps worker
    print_status 0 "Worker updated"
    
    # Update frontend
    print_info "Updating frontend..."
    docker compose build frontend
    docker compose up -d --no-deps frontend
    
    # Wait for frontend health check
    print_info "Waiting for frontend health check..."
    sleep 10
    curl -sf http://localhost:3000 >/dev/null 2>&1
    print_status $? "Frontend update completed"
    
    print_status 0 "Rolling update completed successfully"
}

# Update with maintenance window
update_with_maintenance() {
    print_info "Starting maintenance window update..."
    
    # Enable maintenance mode
    enable_maintenance_mode
    
    # Wait for current requests to complete
    print_info "Waiting for current requests to complete..."
    sleep 30
    
    # Pull latest code
    git fetch origin
    git checkout main
    git pull origin main
    
    # Apply database migrations if needed
    cd backend
    if ! npm run migrate:check 2>/dev/null; then
        print_info "Applying database migrations..."
        npm run migrate
        print_status $? "Database migrations applied"
    fi
    cd ..
    
    # Rebuild and restart services
    print_info "Rebuilding and restarting services..."
    docker compose down
    docker compose build
    docker compose up -d
    
    # Wait for services to be ready
    print_info "Waiting for services to start..."
    sleep 30
    
    # Check system health
    check_system_health
    print_status $? "System health check passed"
    
    # Disable maintenance mode
    disable_maintenance_mode
    
    print_status 0 "Maintenance window update completed successfully"
}

# Blue-green deployment
update_blue_green() {
    print_info "Starting blue-green deployment..."
    
    # This is a simplified version - full implementation would require
    # load balancer configuration and separate environments
    
    print_warning "Blue-green deployment requires additional infrastructure setup"
    print_info "Using maintenance window update instead"
    
    update_with_maintenance
}

# Function to verify update
verify_update() {
    print_info "Verifying system after update..."
    
    # Run system integrity check
    ./scripts/system-integrity-check.sh --test-live
    print_status $? "System integrity check"
    
    # Check critical endpoints
    print_info "Checking critical endpoints..."
    
    # Backend health
    curl -sf http://localhost:5000/health >/dev/null 2>&1
    print_status $? "Backend health endpoint"
    
    # Frontend access
    curl -sf http://localhost:3000 >/dev/null 2>&1
    print_status $? "Frontend access"
    
    # Database connectivity
    docker compose exec postgres pg_isready -U postgres >/dev/null 2>&1
    print_status $? "Database connectivity"
    
    # Redis connectivity
    docker compose exec redis redis-cli ping >/dev/null 2>&1
    print_status $? "Redis connectivity"
    
    print_status 0 "System verification completed"
}

# Function to rollback if needed
rollback_update() {
    print_warning "Rolling back update..."
    
    enable_maintenance_mode
    
    # Restore from backup
    if [ -d "$BACKUP_DIR" ]; then
        print_info "Restoring from backup: $BACKUP_DIR"
        
        # Restore database
        if [ -f "$BACKUP_DIR/database.sql" ]; then
            docker compose exec postgres psql -U postgres -d seth_clinic < "$BACKUP_DIR/database.sql"
            print_status $? "Database restored"
        fi
        
        # Restore configuration
        cp "$BACKUP_DIR/.env" . 2>/dev/null || true
        cp "$BACKUP_DIR/docker-compose.yml" .
        
        # Restart services
        docker compose down
        docker compose up -d
        
        # Wait for services
        sleep 30
        check_system_health
        print_status $? "Services restarted"
        
        disable_maintenance_mode
        print_status 0 "Rollback completed"
    else
        print_status 1 "No backup found for rollback"
    fi
}

# Main script
main() {
    echo "🏥 Seth Medical Clinic CMS - Production Update"
    echo "=============================================="
    
    if [ $# -eq 0 ]; then
        echo "Usage: $0 [rolling|maintenance|blue-green] [--verify-only] [--rollback]"
        echo ""
        echo "Options:"
        echo "  rolling      - Zero downtime rolling update (for compatible changes)"
        echo "  maintenance  - Update with maintenance window (for breaking changes)"
        echo "  blue-green   - Blue-green deployment (requires additional setup)"
        echo "  --verify-only - Only run verification checks"
        echo "  --rollback   - Rollback to previous version"
        echo ""
        echo "Examples:"
        echo "  $0 rolling                # Rolling update for minor changes"
        echo "  $0 maintenance           # Maintenance window for major changes"
        echo "  $0 --verify-only         # Just verify current system"
        echo "  $0 --rollback            # Rollback last update"
        exit 1
    fi
    
    # Parse arguments
    UPDATE_TYPE=""
    VERIFY_ONLY=false
    ROLLBACK=false
    
    for arg in "$@"; do
        case $arg in
            --verify-only)
                VERIFY_ONLY=true
                ;;
            --rollback)
                ROLLBACK=true
                ;;
            rolling|maintenance|blue-green)
                UPDATE_TYPE="$arg"
                ;;
            *)
                print_warning "Unknown argument: $arg"
                ;;
        esac
    done
    
    # Check prerequisites
    print_info "Checking prerequisites..."
    
    # Check if Docker is running
    docker info >/dev/null 2>&1
    print_status $? "Docker is running"
    
    # Check if we're in the right directory
    if [ ! -f "package.json" ] || [ ! -f "docker-compose.yml" ]; then
        print_status 1 "Not in project root directory"
    fi
    print_status 0 "In project directory"
    
    # Check if system is currently running
    if curl -sf http://localhost:5000/health >/dev/null 2>&1; then
        print_status 0 "System is currently running"
    else
        print_warning "System is not running - starting services first"
        docker compose up -d
        sleep 30
        check_system_health
        print_status $? "System started"
    fi
    
    # Handle different operations
    if [ "$ROLLBACK" = true ]; then
        rollback_update
    elif [ "$VERIFY_ONLY" = true ]; then
        verify_update
    elif [ -n "$UPDATE_TYPE" ]; then
        # Create backup before update
        create_backup
        
        # Test migrations if they exist
        test_migrations
        
        # Perform update
        update_system "$UPDATE_TYPE"
        
        # Verify update
        verify_update
        
        print_status 0 "Update completed successfully!"
        print_info "Backup saved to: $BACKUP_DIR"
        print_info "Update log saved to: $UPDATE_LOG"
    else
        print_status 1 "No valid operation specified"
    fi
}

# Run main function with all arguments
main "$@"
