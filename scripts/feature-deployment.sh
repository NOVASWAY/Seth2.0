#!/bin/bash

# =============================================================================
# Seth Medical Clinic CMS - Feature Deployment Script
# =============================================================================
# Deploy new features safely to production with proper testing and rollback
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
FEATURE_BRANCH=""
DEPLOYMENT_LOG="./logs/feature_deployment_$(date +%Y%m%d_%H%M%S).log"
BACKUP_DIR="./backups/feature_$(date +%Y%m%d_%H%M%S)"

# Create directories
mkdir -p $(dirname "$DEPLOYMENT_LOG")
mkdir -p $(dirname "$BACKUP_DIR")

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$DEPLOYMENT_LOG"
}

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

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
    log "INFO: $1"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
    log "WARNING: $1"
}

# Function to validate feature branch
validate_feature_branch() {
    local branch="$1"
    
    print_info "Validating feature branch: $branch"
    
    # Check if branch exists
    if ! git show-ref --verify --quiet refs/heads/"$branch"; then
        if ! git show-ref --verify --quiet refs/remotes/origin/"$branch"; then
            print_status 1 "Branch $branch does not exist"
        fi
    fi
    
    # Check if branch is ahead of main
    git fetch origin
    local commits_ahead=$(git rev-list --count origin/main..origin/"$branch" 2>/dev/null || echo "0")
    if [ "$commits_ahead" -eq 0 ]; then
        print_warning "Feature branch has no new commits compared to main"
    else
        print_info "Feature branch has $commits_ahead new commits"
    fi
    
    print_status 0 "Feature branch validation passed"
}

# Function to run feature tests
run_feature_tests() {
    local branch="$1"
    
    print_info "Running comprehensive tests for feature..."
    
    # Checkout feature branch
    git checkout "$branch"
    git pull origin "$branch"
    
    # Install dependencies
    print_info "Installing dependencies..."
    npm ci
    cd backend && npm ci && cd ..
    
    # Run linting
    print_info "Running code quality checks..."
    npm run lint
    cd backend && npm run lint && cd ..
    print_status $? "Code quality checks"
    
    # Run unit tests
    print_info "Running unit tests..."
    npm run test
    cd backend && npm run test && cd ..
    print_status $? "Unit tests"
    
    # Build project
    print_info "Building project..."
    npm run build
    cd backend && npm run build && cd ..
    print_status $? "Project build"
    
    # Run integration tests
    print_info "Running integration tests..."
    if [ -f "package.json" ] && grep -q "test:integration" package.json; then
        npm run test:integration
        print_status $? "Integration tests"
    else
        print_info "No integration tests defined, skipping"
    fi
    
    print_status 0 "All tests passed"
}

# Function to deploy feature with staging test
deploy_feature_staging() {
    local branch="$1"
    
    print_info "Deploying feature to staging environment..."
    
    # Create staging environment
    if [ -f "docker-compose.staging.yml" ]; then
        docker compose -f docker-compose.staging.yml down 2>/dev/null || true
        docker compose -f docker-compose.staging.yml build
        docker compose -f docker-compose.staging.yml up -d
        
        # Wait for staging to be ready
        print_info "Waiting for staging environment..."
        sleep 30
        
        # Check staging health
        local staging_port=$(grep -A 5 "frontend:" docker-compose.staging.yml | grep -o "3[0-9][0-9][0-9]" | head -1)
        if [ -z "$staging_port" ]; then
            staging_port="3001" # Default staging port
        fi
        
        for i in {1..30}; do
            if curl -sf "http://localhost:$staging_port" >/dev/null 2>&1; then
                print_status 0 "Staging environment ready"
                break
            fi
            if [ $i -eq 30 ]; then
                print_status 1 "Staging environment failed to start"
            fi
            sleep 2
        done
        
        print_info "Feature deployed to staging at http://localhost:$staging_port"
        
    else
        print_warning "No staging configuration found, skipping staging deployment"
    fi
}

# Function to run feature smoke tests
run_smoke_tests() {
    print_info "Running smoke tests on feature..."
    
    # Basic health checks
    curl -sf http://localhost:5000/health >/dev/null 2>&1
    print_status $? "Backend health check"
    
    curl -sf http://localhost:3000 >/dev/null 2>&1
    print_status $? "Frontend health check"
    
    # Database connectivity
    docker compose exec postgres pg_isready -U postgres >/dev/null 2>&1
    print_status $? "Database connectivity"
    
    # Redis connectivity
    docker compose exec redis redis-cli ping >/dev/null 2>&1
    print_status $? "Redis connectivity"
    
    # Run system integrity check
    if [ -f "scripts/system-integrity-check.sh" ]; then
        ./scripts/system-integrity-check.sh
        print_status $? "System integrity check"
    fi
    
    print_status 0 "Smoke tests passed"
}

# Function to deploy feature to production
deploy_feature_production() {
    local branch="$1"
    local deployment_strategy="$2"
    
    print_info "Deploying feature to production using $deployment_strategy strategy..."
    
    # Create production backup
    ./scripts/production-update.sh --verify-only # This creates a backup
    
    # Merge feature to main
    git checkout main
    git pull origin main
    git merge "$branch"
    
    # Deploy using specified strategy
    case "$deployment_strategy" in
        "rolling")
            ./scripts/production-update.sh rolling
            ;;
        "maintenance")
            ./scripts/production-update.sh maintenance
            ;;
        *)
            print_warning "Unknown deployment strategy: $deployment_strategy, using rolling"
            ./scripts/production-update.sh rolling
            ;;
    esac
    
    print_status 0 "Feature deployed to production"
}

# Function to run post-deployment verification
verify_feature_deployment() {
    print_info "Verifying feature deployment..."
    
    # Wait for system to stabilize
    sleep 10
    
    # Run comprehensive verification
    ./scripts/production-update.sh --verify-only
    print_status $? "Production verification"
    
    # Check specific feature endpoints (if provided)
    if [ ! -z "$FEATURE_ENDPOINTS" ]; then
        print_info "Testing feature-specific endpoints..."
        IFS=',' read -ra ENDPOINTS <<< "$FEATURE_ENDPOINTS"
        for endpoint in "${ENDPOINTS[@]}"; do
            if curl -sf "http://localhost:5000$endpoint" >/dev/null 2>&1; then
                print_status 0 "Endpoint $endpoint"
            else
                print_warning "Endpoint $endpoint not responding (might require auth)"
            fi
        done
    fi
    
    print_status 0 "Feature deployment verification completed"
}

# Function to cleanup staging environment
cleanup_staging() {
    print_info "Cleaning up staging environment..."
    
    if [ -f "docker-compose.staging.yml" ]; then
        docker compose -f docker-compose.staging.yml down
        docker compose -f docker-compose.staging.yml down --volumes 2>/dev/null || true
        print_status 0 "Staging environment cleaned up"
    fi
}

# Function to send deployment notification
send_notification() {
    local status="$1"
    local feature="$2"
    
    print_info "Sending deployment notification..."
    
    local message
    if [ "$status" = "success" ]; then
        message="✅ Feature '$feature' successfully deployed to production!"
    else
        message="❌ Feature '$feature' deployment failed. System rolled back."
    fi
    
    # Log notification (in real implementation, this could send emails/Slack messages)
    log "NOTIFICATION: $message"
    
    # Create deployment record
    cat >> "./logs/deployment_history.log" << EOF
$(date '+%Y-%m-%d %H:%M:%S') - Feature: $feature - Status: $status - Branch: $FEATURE_BRANCH
EOF
    
    print_status 0 "Notification sent"
}

# Main deployment function
deploy_feature() {
    local branch="$1"
    local strategy="$2"
    local skip_tests="$3"
    
    print_info "Starting feature deployment pipeline..."
    print_info "Feature branch: $branch"
    print_info "Deployment strategy: $strategy"
    
    # Step 1: Validate feature branch
    validate_feature_branch "$branch"
    
    # Step 2: Run tests (unless skipped)
    if [ "$skip_tests" != "true" ]; then
        run_feature_tests "$branch"
    else
        print_warning "Skipping tests as requested"
    fi
    
    # Step 3: Deploy to staging and test
    deploy_feature_staging "$branch"
    
    # Step 4: Ask for approval (in interactive mode)
    if [ "$INTERACTIVE" = "true" ]; then
        echo ""
        echo "Feature has been deployed to staging. Please test the feature."
        echo "You can access staging at: http://localhost:3001 (or configured staging port)"
        echo ""
        read -p "Do you want to proceed with production deployment? (y/N): " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_info "Production deployment cancelled by user"
            cleanup_staging
            exit 0
        fi
    fi
    
    # Step 5: Deploy to production
    deploy_feature_production "$branch" "$strategy"
    
    # Step 6: Verify deployment
    verify_feature_deployment
    
    # Step 7: Cleanup staging
    cleanup_staging
    
    # Step 8: Send notification
    send_notification "success" "$branch"
    
    print_status 0 "Feature deployment pipeline completed successfully!"
}

# Error handler
error_handler() {
    local exit_code=$?
    print_status $exit_code "Feature deployment failed"
    
    # Cleanup on error
    cleanup_staging
    
    # Try to rollback if we were in the middle of production deployment
    if [ -f "./maintenance.flag" ]; then
        print_warning "Attempting to rollback production changes..."
        ./scripts/production-update.sh --rollback
    fi
    
    # Send failure notification
    send_notification "failed" "$FEATURE_BRANCH"
    
    exit $exit_code
}

# Set error handler
trap error_handler ERR

# Main script
main() {
    echo "🚀 Seth Medical Clinic CMS - Feature Deployment"
    echo "================================================"
    
    if [ $# -eq 0 ]; then
        echo "Usage: $0 <feature-branch> [strategy] [options]"
        echo ""
        echo "Arguments:"
        echo "  feature-branch    - Name of the feature branch to deploy"
        echo ""
        echo "Strategy (optional):"
        echo "  rolling          - Rolling deployment (default, zero downtime)"
        echo "  maintenance      - Maintenance window deployment"
        echo ""
        echo "Options:"
        echo "  --skip-tests     - Skip running tests (not recommended)"
        echo "  --interactive    - Ask for approval before production deployment"
        echo "  --endpoints      - Comma-separated list of endpoints to test"
        echo ""
        echo "Examples:"
        echo "  $0 feature/new-lab-tests                    # Deploy with rolling strategy"
        echo "  $0 feature/sha-updates maintenance          # Deploy with maintenance window"
        echo "  $0 feature/ui-improvements --interactive    # Ask for approval"
        echo "  $0 feature/api-changes --endpoints=/api/lab,/api/prescriptions"
        exit 1
    fi
    
    # Parse arguments
    FEATURE_BRANCH="$1"
    DEPLOYMENT_STRATEGY="${2:-rolling}"
    SKIP_TESTS="false"
    INTERACTIVE="false"
    FEATURE_ENDPOINTS=""
    
    shift 2 2>/dev/null || shift 1
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-tests)
                SKIP_TESTS="true"
                shift
                ;;
            --interactive)
                INTERACTIVE="true"
                shift
                ;;
            --endpoints)
                FEATURE_ENDPOINTS="$2"
                shift 2
                ;;
            *)
                print_warning "Unknown option: $1"
                shift
                ;;
        esac
    done
    
    # Validate deployment strategy
    if [[ "$DEPLOYMENT_STRATEGY" != "rolling" && "$DEPLOYMENT_STRATEGY" != "maintenance" ]]; then
        print_warning "Unknown deployment strategy: $DEPLOYMENT_STRATEGY, using rolling"
        DEPLOYMENT_STRATEGY="rolling"
    fi
    
    # Check prerequisites
    print_info "Checking prerequisites..."
    
    # Check if we're in the right directory
    if [ ! -f "package.json" ] || [ ! -f "docker-compose.yml" ]; then
        print_status 1 "Not in project root directory"
    fi
    
    # Check if production-update script exists
    if [ ! -f "scripts/production-update.sh" ]; then
        print_status 1 "Production update script not found"
    fi
    
    # Check if system is running
    if ! curl -sf http://localhost:5000/health >/dev/null 2>&1; then
        print_warning "System is not running - starting services first"
        docker compose up -d
        sleep 30
    fi
    
    print_status 0 "Prerequisites check passed"
    
    # Start deployment
    deploy_feature "$FEATURE_BRANCH" "$DEPLOYMENT_STRATEGY" "$SKIP_TESTS"
    
    echo ""
    echo "🎉 Feature deployment completed successfully!"
    echo "Deployment log: $DEPLOYMENT_LOG"
    echo "System is running at: http://localhost:3000"
    echo ""
}

# Run main function with all arguments
main "$@"
