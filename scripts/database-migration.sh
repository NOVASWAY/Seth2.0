#!/bin/bash

# =============================================================================
# Seth Medical Clinic CMS - Database Migration Script
# =============================================================================
# Safely manage database migrations in production without data loss
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
MIGRATION_DIR="backend/database/migrations"
BACKUP_DIR="./backups/migrations/$(date +%Y%m%d_%H%M%S)"
MIGRATION_LOG="./logs/migration_$(date +%Y%m%d_%H%M%S).log"

# Create directories
mkdir -p "$MIGRATION_DIR"
mkdir -p $(dirname "$BACKUP_DIR")
mkdir -p $(dirname "$MIGRATION_LOG")

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$MIGRATION_LOG"
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

# Function to get database URL
get_database_url() {
    if [ -f ".env" ]; then
        local db_url=$(grep "DATABASE_URL=" .env | cut -d'=' -f2- | tr -d '"')
        if [ -n "$db_url" ]; then
            echo "$db_url"
            return
        fi
    fi
    
    # Fallback to component parts
    local db_host="localhost"
    local db_port="5432"
    local db_name="seth_clinic"
    local db_user="postgres"
    local db_pass=""
    
    if [ -f ".env" ]; then
        db_pass=$(grep "POSTGRES_PASSWORD=" .env | cut -d'=' -f2 | tr -d '"')
    fi
    
    echo "postgresql://$db_user:$db_pass@$db_host:$db_port/$db_name"
}

# Function to test database connection
test_database_connection() {
    print_info "Testing database connection..."
    
    local db_url=$(get_database_url)
    
    # Test with psql
    if docker compose exec postgres pg_isready -U postgres >/dev/null 2>&1; then
        print_status 0 "Database connection successful"
    else
        print_status 1 "Database connection failed"
    fi
}

# Function to create database backup
create_database_backup() {
    print_info "Creating database backup..."
    
    mkdir -p "$BACKUP_DIR"
    
    # Full database backup
    docker compose exec postgres pg_dump -U postgres seth_clinic > "$BACKUP_DIR/full_backup.sql"
    print_status $? "Full database backup created"
    
    # Schema-only backup
    docker compose exec postgres pg_dump -U postgres --schema-only seth_clinic > "$BACKUP_DIR/schema_backup.sql"
    print_status $? "Schema backup created"
    
    # Data-only backup
    docker compose exec postgres pg_dump -U postgres --data-only seth_clinic > "$BACKUP_DIR/data_backup.sql"
    print_status $? "Data backup created"
    
    # Create backup manifest
    cat > "$BACKUP_DIR/manifest.txt" << EOF
Backup created: $(date)
Database: seth_clinic
Migration script: $(basename "$0")
Git commit: $(git rev-parse HEAD 2>/dev/null || echo "N/A")
EOF
    
    print_status 0 "Database backup completed: $BACKUP_DIR"
}

# Function to create a new migration file
create_migration() {
    local migration_name="$1"
    
    if [ -z "$migration_name" ]; then
        print_status 1 "Migration name is required"
    fi
    
    print_info "Creating new migration: $migration_name"
    
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local migration_file="$MIGRATION_DIR/${timestamp}_${migration_name}.sql"
    
    cat > "$migration_file" << EOF
-- Migration: $migration_name
-- Created: $(date)
-- Description: [Add description here]

-- =============================================================================
-- UP Migration (Apply changes)
-- =============================================================================

BEGIN;

-- Add your migration SQL here
-- Example:
-- ALTER TABLE patients ADD COLUMN emergency_contact VARCHAR(100);
-- CREATE INDEX idx_patients_emergency_contact ON patients(emergency_contact);

-- Always check if changes are safe:
-- 1. New columns should have defaults or allow NULL
-- 2. New indexes can be created concurrently
-- 3. Avoid dropping columns in production
-- 4. Test on copy of production data first

COMMIT;

-- =============================================================================
-- DOWN Migration (Rollback changes) 
-- =============================================================================

-- ROLLBACK SQL (commented out for safety):
-- BEGIN;
-- 
-- -- Reverse the changes made above
-- -- Example:
-- -- DROP INDEX IF EXISTS idx_patients_emergency_contact;
-- -- ALTER TABLE patients DROP COLUMN IF EXISTS emergency_contact;
-- 
-- COMMIT;
EOF
    
    print_status 0 "Migration file created: $migration_file"
    print_info "Please edit the migration file before applying it"
}

# Function to list pending migrations
list_migrations() {
    print_info "Listing migration files..."
    
    if [ ! -d "$MIGRATION_DIR" ]; then
        print_info "No migration directory found"
        return
    fi
    
    local migration_files=($(ls "$MIGRATION_DIR"/*.sql 2>/dev/null | sort))
    
    if [ ${#migration_files[@]} -eq 0 ]; then
        print_info "No migration files found"
        return
    fi
    
    echo ""
    echo "Available migrations:"
    echo "===================="
    
    for file in "${migration_files[@]}"; do
        local filename=$(basename "$file")
        local description=$(grep "-- Description:" "$file" | cut -d':' -f2- | sed 's/^ *//')
        
        echo "📄 $filename"
        if [ -n "$description" ] && [ "$description" != "[Add description here]" ]; then
            echo "   Description: $description"
        fi
        echo ""
    done
}

# Function to validate migration file
validate_migration() {
    local migration_file="$1"
    
    print_info "Validating migration file: $(basename "$migration_file")"
    
    # Check if file exists
    if [ ! -f "$migration_file" ]; then
        print_status 1 "Migration file not found: $migration_file"
    fi
    
    # Check for basic structure
    if ! grep -q "BEGIN;" "$migration_file"; then
        print_warning "Migration file should use transactions (BEGIN/COMMIT)"
    fi
    
    # Check for dangerous operations
    if grep -iq "DROP TABLE\|DROP COLUMN\|ALTER TABLE.*DROP" "$migration_file"; then
        print_warning "Migration contains potentially dangerous DROP operations"
        echo "Are you sure you want to proceed? This could cause data loss!"
        read -p "Type 'yes' to continue: " confirmation
        if [ "$confirmation" != "yes" ]; then
            print_status 1 "Migration cancelled by user"
        fi
    fi
    
    # Try to parse SQL (basic check)
    if ! docker compose exec postgres psql -U postgres -d seth_clinic --echo-queries --dry-run < "$migration_file" >/dev/null 2>&1; then
        print_warning "Migration file may contain SQL syntax errors"
    fi
    
    print_status 0 "Migration validation completed"
}

# Function to test migration on copy
test_migration() {
    local migration_file="$1"
    
    print_info "Testing migration on database copy..."
    
    # Create test database
    local test_db="seth_clinic_test_$(date +%s)"
    
    print_info "Creating test database: $test_db"
    docker compose exec postgres createdb -U postgres "$test_db"
    
    # Copy production data to test database
    print_info "Copying production data to test database..."
    docker compose exec postgres pg_dump -U postgres seth_clinic | docker compose exec postgres psql -U postgres -d "$test_db"
    
    # Apply migration to test database
    print_info "Applying migration to test database..."
    if docker compose exec postgres psql -U postgres -d "$test_db" < "$migration_file"; then
        print_status 0 "Migration test successful"
        
        # Verify test database structure
        print_info "Verifying test database structure..."
        docker compose exec postgres psql -U postgres -d "$test_db" -c "\dt" >/dev/null 2>&1
        print_status $? "Test database structure verification"
        
    else
        print_status 1 "Migration test failed"
    fi
    
    # Cleanup test database
    print_info "Cleaning up test database..."
    docker compose exec postgres dropdb -U postgres "$test_db"
    print_status 0 "Test database cleaned up"
}

# Function to apply migration
apply_migration() {
    local migration_file="$1"
    local skip_test="$2"
    
    print_info "Applying migration: $(basename "$migration_file")"
    
    # Validate migration
    validate_migration "$migration_file"
    
    # Test migration on copy (unless skipped)
    if [ "$skip_test" != "true" ]; then
        test_migration "$migration_file"
    else
        print_warning "Skipping migration test as requested"
    fi
    
    # Create backup before applying
    create_database_backup
    
    # Apply migration to production
    print_info "Applying migration to production database..."
    
    # Check if maintenance mode should be enabled
    if grep -iq "CREATE INDEX\|ALTER TABLE.*ADD CONSTRAINT\|CREATE TABLE" "$migration_file"; then
        print_warning "Migration may require maintenance mode for safety"
        if [ "$ENABLE_MAINTENANCE" = "true" ]; then
            if [ -f "scripts/production-update.sh" ]; then
                touch "./maintenance.flag"
                print_info "Maintenance mode enabled"
            fi
        fi
    fi
    
    # Apply the migration
    if docker compose exec postgres psql -U postgres -d seth_clinic < "$migration_file"; then
        print_status 0 "Migration applied successfully"
        
        # Log successful migration
        echo "$(date '+%Y-%m-%d %H:%M:%S') - APPLIED: $(basename "$migration_file")" >> "./logs/migration_history.log"
        
    else
        print_status 1 "Migration failed - check logs and consider rollback"
    fi
    
    # Disable maintenance mode if it was enabled
    if [ -f "./maintenance.flag" ] && [ "$ENABLE_MAINTENANCE" = "true" ]; then
        rm -f "./maintenance.flag"
        print_info "Maintenance mode disabled"
    fi
    
    # Verify database integrity
    print_info "Verifying database integrity..."
    docker compose exec postgres psql -U postgres -d seth_clinic -c "SELECT 1;" >/dev/null 2>&1
    print_status $? "Database integrity check"
}

# Function to rollback migration
rollback_migration() {
    local backup_dir="$1"
    
    if [ -z "$backup_dir" ]; then
        # Find most recent backup
        backup_dir=$(ls -t ./backups/migrations/ 2>/dev/null | head -1)
        if [ -n "$backup_dir" ]; then
            backup_dir="./backups/migrations/$backup_dir"
        fi
    fi
    
    if [ -z "$backup_dir" ] || [ ! -d "$backup_dir" ]; then
        print_status 1 "No backup directory specified or found"
    fi
    
    print_warning "Rolling back database to backup: $backup_dir"
    
    # Confirm rollback
    echo "This will restore the database to the state before the migration."
    echo "All data changes since the backup will be lost!"
    read -p "Type 'ROLLBACK' to confirm: " confirmation
    if [ "$confirmation" != "ROLLBACK" ]; then
        print_status 1 "Rollback cancelled by user"
    fi
    
    # Enable maintenance mode
    touch "./maintenance.flag"
    print_info "Maintenance mode enabled for rollback"
    
    # Restore database
    print_info "Restoring database from backup..."
    if [ -f "$backup_dir/full_backup.sql" ]; then
        # Drop and recreate database
        docker compose exec postgres psql -U postgres -c "DROP DATABASE IF EXISTS seth_clinic;"
        docker compose exec postgres psql -U postgres -c "CREATE DATABASE seth_clinic;"
        
        # Restore data
        docker compose exec postgres psql -U postgres -d seth_clinic < "$backup_dir/full_backup.sql"
        print_status $? "Database rollback completed"
        
        # Log rollback
        echo "$(date '+%Y-%m-%d %H:%M:%S') - ROLLBACK: Restored from $backup_dir" >> "./logs/migration_history.log"
        
    else
        print_status 1 "Backup file not found in $backup_dir"
    fi
    
    # Disable maintenance mode
    rm -f "./maintenance.flag"
    print_info "Maintenance mode disabled"
    
    print_status 0 "Database rollback completed"
}

# Main script
main() {
    echo "🗄️  Seth Medical Clinic CMS - Database Migration Manager"
    echo "======================================================="
    
    if [ $# -eq 0 ]; then
        echo "Usage: $0 <command> [options]"
        echo ""
        echo "Commands:"
        echo "  create <name>        - Create a new migration file"
        echo "  list                 - List all migration files"
        echo "  apply <file>         - Apply a specific migration"
        echo "  test <file>          - Test a migration on a database copy"
        echo "  rollback [backup]    - Rollback to a previous backup"
        echo "  backup               - Create a database backup only"
        echo ""
        echo "Options:"
        echo "  --skip-test          - Skip testing migration on copy (not recommended)"
        echo "  --maintenance        - Enable maintenance mode during migration"
        echo ""
        echo "Examples:"
        echo "  $0 create add_patient_allergies"
        echo "  $0 list"
        echo "  $0 apply backend/database/migrations/20240115_120000_add_patient_allergies.sql"
        echo "  $0 test backend/database/migrations/20240115_120000_add_patient_allergies.sql"
        echo "  $0 rollback ./backups/migrations/20240115_115500"
        echo "  $0 backup"
        exit 1
    fi
    
    # Parse arguments
    COMMAND="$1"
    shift
    
    SKIP_TEST="false"
    ENABLE_MAINTENANCE="false"
    
    # Parse options
    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-test)
                SKIP_TEST="true"
                shift
                ;;
            --maintenance)
                ENABLE_MAINTENANCE="true"
                shift
                ;;
            *)
                # Store remaining arguments
                ARGS+=("$1")
                shift
                ;;
        esac
    done
    
    # Check prerequisites
    print_info "Checking prerequisites..."
    
    # Check if we're in the right directory
    if [ ! -f "package.json" ] || [ ! -f "docker-compose.yml" ]; then
        print_status 1 "Not in project root directory"
    fi
    
    # Test database connection
    test_database_connection
    
    print_status 0 "Prerequisites check passed"
    
    # Execute command
    case "$COMMAND" in
        "create")
            if [ ${#ARGS[@]} -eq 0 ]; then
                print_status 1 "Migration name is required for create command"
            fi
            create_migration "${ARGS[0]}"
            ;;
        "list")
            list_migrations
            ;;
        "apply")
            if [ ${#ARGS[@]} -eq 0 ]; then
                print_status 1 "Migration file is required for apply command"
            fi
            apply_migration "${ARGS[0]}" "$SKIP_TEST"
            ;;
        "test")
            if [ ${#ARGS[@]} -eq 0 ]; then
                print_status 1 "Migration file is required for test command"
            fi
            test_migration "${ARGS[0]}"
            ;;
        "rollback")
            rollback_migration "${ARGS[0]}"
            ;;
        "backup")
            create_database_backup
            ;;
        *)
            print_status 1 "Unknown command: $COMMAND"
            ;;
    esac
    
    print_status 0 "Migration operation completed successfully"
    print_info "Migration log: $MIGRATION_LOG"
}

# Run main function with all arguments
main "$@"
