#!/bin/bash

# =============================================================================
# Seth Medical Clinic CMS - Automated Backup and Recovery System
# =============================================================================
# This script provides comprehensive backup and recovery capabilities with
# encryption, compression, and automated scheduling.

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="/var/backups/seth-clinic"
LOG_FILE="/var/log/seth-clinic-backup.log"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_PREFIX="seth-clinic-backup"

# Backup retention settings
DAILY_RETENTION_DAYS=7
WEEKLY_RETENTION_WEEKS=4
MONTHLY_RETENTION_MONTHS=12

# =============================================================================
# Utility Functions
# =============================================================================

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
    echo "$(date '+%Y-%m-%d %H:%M:%S') INFO: $1" >> "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
    echo "$(date '+%Y-%m-%d %H:%M:%S') SUCCESS: $1" >> "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
    echo "$(date '+%Y-%m-%d %H:%M:%S') WARNING: $1" >> "$LOG_FILE"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
    echo "$(date '+%Y-%m-%d %H:%M:%S') ERROR: $1" >> "$LOG_FILE"
}

log_header() {
    echo -e "${PURPLE}💾 $1${NC}"
}

# =============================================================================
# Backup Directory Setup
# =============================================================================

setup_backup_directory() {
    log_header "Setting Up Backup Directory"
    
    # Create backup directory structure
    mkdir -p "$BACKUP_DIR"/{daily,weekly,monthly,recovery}
    
    # Set secure permissions
    chmod 700 "$BACKUP_DIR"
    chmod 700 "$BACKUP_DIR"/daily
    chmod 700 "$BACKUP_DIR"/weekly
    chmod 700 "$BACKUP_DIR"/monthly
    chmod 700 "$BACKUP_DIR"/recovery
    
    log_success "Backup directory structure created"
}

# =============================================================================
# Database Backup
# =============================================================================

backup_database() {
    local backup_type=$1
    local backup_path=$2
    
    log_header "Backing Up Database"
    
    # Check if PostgreSQL is running
    if ! docker-compose -f "$PROJECT_ROOT/docker-compose.yml" ps postgres | grep -q "Up"; then
        log_error "PostgreSQL container is not running"
        return 1
    fi
    
    # Create database backup
    local db_backup_file="$backup_path/database-$DATE.sql"
    log_info "Creating database backup: $db_backup_file"
    
    if docker-compose -f "$PROJECT_ROOT/docker-compose.yml" exec -T postgres pg_dump -U postgres -d seth_clinic --no-password --verbose > "$db_backup_file" 2>>"$LOG_FILE"; then
        log_success "Database backup created successfully"
        
        # Compress database backup
        gzip "$db_backup_file"
        log_success "Database backup compressed"
        
        # Get backup size
        local backup_size=$(du -h "$db_backup_file.gz" | cut -f1)
        log_info "Database backup size: $backup_size"
        
        return 0
    else
        log_error "Database backup failed"
        return 1
    fi
}

# =============================================================================
# Application Data Backup
# =============================================================================

backup_application_data() {
    local backup_type=$1
    local backup_path=$2
    
    log_header "Backing Up Application Data"
    
    # Create application backup
    local app_backup_file="$backup_path/application-$DATE.tar.gz"
    log_info "Creating application backup: $app_backup_file"
    
    # Define what to include and exclude
    local include_paths=(
        "$PROJECT_ROOT/app"
        "$PROJECT_ROOT/components"
        "$PROJECT_ROOT/lib"
        "$PROJECT_ROOT/types"
        "$PROJECT_ROOT/hooks"
        "$PROJECT_ROOT/backend/src"
        "$PROJECT_ROOT/database"
        "$PROJECT_ROOT/nginx"
        "$PROJECT_ROOT/scripts"
        "$PROJECT_ROOT/uploads"
        "$PROJECT_ROOT/.env"
        "$PROJECT_ROOT/.env.production"
        "$PROJECT_ROOT/package.json"
        "$PROJECT_ROOT/package-lock.json"
        "$PROJECT_ROOT/docker-compose.yml"
        "$PROJECT_ROOT/docker-compose.prod.yml"
        "$PROJECT_ROOT/Dockerfile"
        "$PROJECT_ROOT/next.config.mjs"
        "$PROJECT_ROOT/tailwind.config.ts"
        "$PROJECT_ROOT/tsconfig.json"
    )
    
    local exclude_patterns=(
        "--exclude=node_modules"
        "--exclude=.git"
        "--exclude=logs"
        "--exclude=coverage"
        "--exclude=test-results"
        "--exclude=playwright-report"
        "--exclude=uploads/temp"
        "--exclude=*.log"
        "--exclude=.next"
        "--exclude=dist"
        "--exclude=build"
    )
    
    # Create tar archive
    if tar -czf "$app_backup_file" "${exclude_patterns[@]}" -C "$PROJECT_ROOT" . 2>>"$LOG_FILE"; then
        log_success "Application backup created successfully"
        
        # Get backup size
        local backup_size=$(du -h "$app_backup_file" | cut -f1)
        log_info "Application backup size: $backup_size"
        
        return 0
    else
        log_error "Application backup failed"
        return 1
    fi
}

# =============================================================================
# Configuration Backup
# =============================================================================

backup_configuration() {
    local backup_type=$1
    local backup_path=$2
    
    log_header "Backing Up Configuration"
    
    # Create configuration backup
    local config_backup_file="$backup_path/configuration-$DATE.tar.gz"
    log_info "Creating configuration backup: $config_backup_file"
    
    # Backup configuration files
    local config_files=(
        "$PROJECT_ROOT/.env"
        "$PROJECT_ROOT/.env.production"
        "$PROJECT_ROOT/nginx/nginx.conf"
        "$PROJECT_ROOT/nginx/ssl"
        "$PROJECT_ROOT/database/schema.sql"
        "$PROJECT_ROOT/database/migrations"
        "$PROJECT_ROOT/docker-compose.yml"
        "$PROJECT_ROOT/docker-compose.prod.yml"
        "$PROJECT_ROOT/Dockerfile"
        "$PROJECT_ROOT/next.config.mjs"
        "$PROJECT_ROOT/tailwind.config.ts"
        "$PROJECT_ROOT/tsconfig.json"
        "$PROJECT_ROOT/package.json"
        "$PROJECT_ROOT/package-lock.json"
    )
    
    # Create configuration archive
    if tar -czf "$config_backup_file" -C "$PROJECT_ROOT" "${config_files[@]}" 2>>"$LOG_FILE"; then
        log_success "Configuration backup created successfully"
        
        # Get backup size
        local backup_size=$(du -h "$config_backup_file" | cut -f1)
        log_info "Configuration backup size: $backup_size"
        
        return 0
    else
        log_error "Configuration backup failed"
        return 1
    fi
}

# =============================================================================
# Encrypt Backup
# =============================================================================

encrypt_backup() {
    local backup_file=$1
    local backup_type=$2
    
    log_header "Encrypting Backup"
    
    # Check if GPG is available
    if ! command -v gpg >/dev/null 2>&1; then
        log_warning "GPG not available, skipping encryption"
        return 0
    fi
    
    # Check if encryption key exists
    if ! gpg --list-secret-keys --keyid-format LONG | grep -q "seth-clinic-backup"; then
        log_warning "Backup encryption key not found, creating new key..."
        create_backup_key
    fi
    
    # Encrypt backup
    local encrypted_file="${backup_file}.gpg"
    log_info "Encrypting backup: $encrypted_file"
    
    if gpg --symmetric --cipher-algo AES256 --output "$encrypted_file" "$backup_file" 2>>"$LOG_FILE"; then
        log_success "Backup encrypted successfully"
        
        # Remove unencrypted file
        rm "$backup_file"
        log_info "Unencrypted backup removed"
        
        return 0
    else
        log_error "Backup encryption failed"
        return 1
    fi
}

# =============================================================================
# Create Backup Key
# =============================================================================

create_backup_key() {
    log_info "Creating backup encryption key..."
    
    # Create key configuration
    cat > /tmp/gpg-key-config << EOF
Key-Type: RSA
Key-Length: 2048
Subkey-Type: RSA
Subkey-Length: 2048
Name-Real: Seth Clinic Backup
Name-Email: backup@sethclinic.com
Expire-Date: 0
%no-protection
%commit
EOF
    
    # Generate key
    if gpg --batch --generate-key /tmp/gpg-key-config 2>>"$LOG_FILE"; then
        log_success "Backup encryption key created"
    else
        log_error "Failed to create backup encryption key"
    fi
    
    # Clean up
    rm /tmp/gpg-key-config
}

# =============================================================================
# Create Full Backup
# =============================================================================

create_full_backup() {
    local backup_type=$1
    
    log_header "Creating Full Backup ($backup_type)"
    
    # Determine backup path
    local backup_path="$BACKUP_DIR/$backup_type"
    local backup_name="$BACKUP_PREFIX-$backup_type-$DATE"
    local backup_dir="$backup_path/$backup_name"
    
    # Create backup directory
    mkdir -p "$backup_dir"
    
    # Create backup manifest
    local manifest_file="$backup_dir/manifest.json"
    cat > "$manifest_file" << EOF
{
  "backup_type": "$backup_type",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "version": "1.0.0",
  "components": []
}
EOF
    
    local backup_success=true
    
    # Backup database
    if backup_database "$backup_type" "$backup_dir"; then
        echo "$(jq '.components += ["database"]' "$manifest_file")" > "$manifest_file"
    else
        backup_success=false
    fi
    
    # Backup application data
    if backup_application_data "$backup_type" "$backup_dir"; then
        echo "$(jq '.components += ["application"]' "$manifest_file")" > "$manifest_file"
    else
        backup_success=false
    fi
    
    # Backup configuration
    if backup_configuration "$backup_type" "$backup_dir"; then
        echo "$(jq '.components += ["configuration"]' "$manifest_file")" > "$manifest_file"
    else
        backup_success=false
    fi
    
    # Encrypt backup if requested
    if [ "$ENCRYPT_BACKUPS" = "true" ]; then
        for file in "$backup_dir"/*.gz; do
            if [ -f "$file" ]; then
                encrypt_backup "$file" "$backup_type"
            fi
        done
    fi
    
    # Update manifest with final status
    echo "$(jq ".success = $backup_success" "$manifest_file")" > "$manifest_file"
    
    if [ "$backup_success" = true ]; then
        log_success "Full backup completed successfully: $backup_name"
        
        # Create backup summary
        local total_size=$(du -sh "$backup_dir" | cut -f1)
        log_info "Total backup size: $total_size"
        
        return 0
    else
        log_error "Full backup completed with errors: $backup_name"
        return 1
    fi
}

# =============================================================================
# Cleanup Old Backups
# =============================================================================

cleanup_old_backups() {
    log_header "Cleaning Up Old Backups"
    
    # Cleanup daily backups
    log_info "Cleaning up daily backups older than $DAILY_RETENTION_DAYS days..."
    find "$BACKUP_DIR/daily" -type d -name "$BACKUP_PREFIX-daily-*" -mtime +$DAILY_RETENTION_DAYS -exec rm -rf {} \; 2>/dev/null || true
    
    # Cleanup weekly backups
    log_info "Cleaning up weekly backups older than $WEEKLY_RETENTION_WEEKS weeks..."
    find "$BACKUP_DIR/weekly" -type d -name "$BACKUP_PREFIX-weekly-*" -mtime +$((WEEKLY_RETENTION_WEEKS * 7)) -exec rm -rf {} \; 2>/dev/null || true
    
    # Cleanup monthly backups
    log_info "Cleaning up monthly backups older than $MONTHLY_RETENTION_MONTHS months..."
    find "$BACKUP_DIR/monthly" -type d -name "$BACKUP_PREFIX-monthly-*" -mtime +$((MONTHLY_RETENTION_MONTHS * 30)) -exec rm -rf {} \; 2>/dev/null || true
    
    log_success "Backup cleanup completed"
}

# =============================================================================
# List Available Backups
# =============================================================================

list_backups() {
    log_header "Available Backups"
    
    echo ""
    echo "Daily Backups:"
    ls -la "$BACKUP_DIR/daily" 2>/dev/null | grep "$BACKUP_PREFIX-daily-" || echo "  No daily backups found"
    
    echo ""
    echo "Weekly Backups:"
    ls -la "$BACKUP_DIR/weekly" 2>/dev/null | grep "$BACKUP_PREFIX-weekly-" || echo "  No weekly backups found"
    
    echo ""
    echo "Monthly Backups:"
    ls -la "$BACKUP_DIR/monthly" 2>/dev/null | grep "$BACKUP_PREFIX-monthly-" || echo "  No monthly backups found"
    
    echo ""
}

# =============================================================================
# Restore from Backup
# =============================================================================

restore_backup() {
    local backup_name=$1
    
    log_header "Restoring from Backup: $backup_name"
    
    # Find backup directory
    local backup_dir=""
    for backup_type in daily weekly monthly; do
        if [ -d "$BACKUP_DIR/$backup_type/$backup_name" ]; then
            backup_dir="$BACKUP_DIR/$backup_type/$backup_name"
            break
        fi
    done
    
    if [ -z "$backup_dir" ]; then
        log_error "Backup not found: $backup_name"
        return 1
    fi
    
    # Check backup manifest
    local manifest_file="$backup_dir/manifest.json"
    if [ ! -f "$manifest_file" ]; then
        log_error "Backup manifest not found"
        return 1
    fi
    
    local backup_success=$(jq -r '.success' "$manifest_file")
    if [ "$backup_success" != "true" ]; then
        log_error "Backup is marked as failed, cannot restore"
        return 1
    fi
    
    # Stop services
    log_info "Stopping services..."
    docker-compose -f "$PROJECT_ROOT/docker-compose.yml" down 2>/dev/null || true
    
    # Restore database
    if [ -f "$backup_dir/database-$DATE.sql.gz" ]; then
        log_info "Restoring database..."
        gunzip -c "$backup_dir/database-$DATE.sql.gz" | docker-compose -f "$PROJECT_ROOT/docker-compose.yml" exec -T postgres psql -U postgres -d seth_clinic
        log_success "Database restored"
    fi
    
    # Restore application data
    if [ -f "$backup_dir/application-$DATE.tar.gz" ]; then
        log_info "Restoring application data..."
        tar -xzf "$backup_dir/application-$DATE.tar.gz" -C "$PROJECT_ROOT"
        log_success "Application data restored"
    fi
    
    # Restore configuration
    if [ -f "$backup_dir/configuration-$DATE.tar.gz" ]; then
        log_info "Restoring configuration..."
        tar -xzf "$backup_dir/configuration-$DATE.tar.gz" -C "$PROJECT_ROOT"
        log_success "Configuration restored"
    fi
    
    # Start services
    log_info "Starting services..."
    docker-compose -f "$PROJECT_ROOT/docker-compose.yml" up -d
    
    log_success "Backup restore completed successfully"
}

# =============================================================================
# Main Backup Function
# =============================================================================

main() {
    local backup_type=${1:-daily}
    
    log_header "Starting Backup Process ($backup_type)"
    
    # Create log directory if it doesn't exist
    mkdir -p "$(dirname "$LOG_FILE")"
    
    # Setup backup directory
    setup_backup_directory
    
    # Create backup
    if create_full_backup "$backup_type"; then
        log_success "Backup process completed successfully"
        
        # Cleanup old backups
        cleanup_old_backups
        
        # List available backups
        list_backups
        
        exit 0
    else
        log_error "Backup process failed"
        exit 1
    fi
}

# =============================================================================
# Command Line Interface
# =============================================================================

show_help() {
    echo "Seth Medical Clinic CMS - Backup and Recovery System"
    echo ""
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  backup [TYPE]     Create backup (daily|weekly|monthly)"
    echo "  restore [NAME]    Restore from backup"
    echo "  list              List available backups"
    echo "  cleanup           Clean up old backups"
    echo "  setup             Setup backup directory"
    echo ""
    echo "Options:"
    echo "  -h, --help        Show this help message"
    echo "  -e, --encrypt     Encrypt backups"
    echo "  -q, --quiet       Quiet mode"
    echo ""
    echo "Examples:"
    echo "  $0 backup daily           # Create daily backup"
    echo "  $0 backup weekly -e       # Create encrypted weekly backup"
    echo "  $0 restore seth-clinic-backup-daily-20240101_120000"
    echo "  $0 list                   # List all backups"
    echo ""
}

# Parse command line arguments
COMMAND=""
BACKUP_TYPE="daily"
ENCRYPT_BACKUPS="false"
QUIET=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -e|--encrypt)
            ENCRYPT_BACKUPS="true"
            shift
            ;;
        -q|--quiet)
            QUIET=true
            shift
            ;;
        backup)
            COMMAND="backup"
            if [ -n "$2" ] && [[ "$2" =~ ^(daily|weekly|monthly)$ ]]; then
                BACKUP_TYPE="$2"
                shift 2
            else
                shift
            fi
            ;;
        restore)
            COMMAND="restore"
            if [ -n "$2" ]; then
                BACKUP_NAME="$2"
                shift 2
            else
                log_error "Backup name required for restore"
                exit 1
            fi
            ;;
        list)
            COMMAND="list"
            shift
            ;;
        cleanup)
            COMMAND="cleanup"
            shift
            ;;
        setup)
            COMMAND="setup"
            shift
            ;;
        *)
            log_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Execute command
case $COMMAND in
    backup)
        main "$BACKUP_TYPE"
        ;;
    restore)
        restore_backup "$BACKUP_NAME"
        ;;
    list)
        setup_backup_directory
        list_backups
        ;;
    cleanup)
        setup_backup_directory
        cleanup_old_backups
        ;;
    setup)
        setup_backup_directory
        ;;
    "")
        show_help
        ;;
    *)
        log_error "Unknown command: $COMMAND"
        show_help
        exit 1
        ;;
esac
