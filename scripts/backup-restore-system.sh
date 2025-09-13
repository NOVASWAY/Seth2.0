#!/bin/bash

# Comprehensive backup and restore script for Seth Clinic CMS
# This script handles full system backup and restore operations

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
BACKUP_BASE_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="$BACKUP_BASE_DIR/$TIMESTAMP"
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-30}

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

print_alert() {
    echo -e "${PURPLE}[ALERT]${NC} $1"
}

# Function to create backup directory
create_backup_directory() {
    print_status "Creating backup directory: $BACKUP_DIR"
    mkdir -p "$BACKUP_DIR"
    mkdir -p "$BACKUP_DIR/postgres"
    mkdir -p "$BACKUP_DIR/mongodb"
    mkdir -p "$BACKUP_DIR/redis"
    mkdir -p "$BACKUP_DIR/uploads"
    mkdir -p "$BACKUP_DIR/exports"
    mkdir -p "$BACKUP_DIR/config"
    print_success "Backup directory created"
}

# Function to backup PostgreSQL
backup_postgres() {
    print_status "Backing up PostgreSQL database..."
    
    if docker-compose exec -T postgres pg_dump -U postgres seth_clinic > "$BACKUP_DIR/postgres/seth_clinic.sql"; then
        print_success "PostgreSQL backup completed"
        
        # Get database size
        local db_size=$(du -h "$BACKUP_DIR/postgres/seth_clinic.sql" | cut -f1)
        print_status "PostgreSQL backup size: $db_size"
    else
        print_error "PostgreSQL backup failed"
        return 1
    fi
}

# Function to backup MongoDB
backup_mongodb() {
    print_status "Backing up MongoDB database..."
    
    if docker-compose exec -T mongodb mongodump --db seth_clinic_mongo --out "$BACKUP_DIR/mongodb/"; then
        print_success "MongoDB backup completed"
        
        # Get database size
        local db_size=$(du -sh "$BACKUP_DIR/mongodb/" | cut -f1)
        print_status "MongoDB backup size: $db_size"
    else
        print_error "MongoDB backup failed"
        return 1
    fi
}

# Function to backup Redis
backup_redis() {
    print_status "Backing up Redis database..."
    
    if docker-compose exec -T redis redis-cli --rdb "$BACKUP_DIR/redis/dump.rdb"; then
        print_success "Redis backup completed"
        
        # Get database size
        local db_size=$(du -h "$BACKUP_DIR/redis/dump.rdb" | cut -f1)
        print_status "Redis backup size: $db_size"
    else
        print_error "Redis backup failed"
        return 1
    fi
}

# Function to backup uploads
backup_uploads() {
    print_status "Backing up uploads directory..."
    
    if docker cp seth-clinic-backend:/app/uploads/. "$BACKUP_DIR/uploads/"; then
        print_success "Uploads backup completed"
        
        # Get uploads size
        local uploads_size=$(du -sh "$BACKUP_DIR/uploads/" | cut -f1)
        print_status "Uploads backup size: $uploads_size"
    else
        print_warning "Uploads backup failed (directory may not exist)"
    fi
}

# Function to backup exports
backup_exports() {
    print_status "Backing up exports directory..."
    
    if docker cp seth-clinic-backend:/app/exports/. "$BACKUP_DIR/exports/"; then
        print_success "Exports backup completed"
        
        # Get exports size
        local exports_size=$(du -sh "$BACKUP_DIR/exports/" | cut -f1)
        print_status "Exports backup size: $exports_size"
    else
        print_warning "Exports backup failed (directory may not exist)"
    fi
}

# Function to backup configuration files
backup_config() {
    print_status "Backing up configuration files..."
    
    # Backup environment files
    cp .env* "$BACKUP_DIR/config/" 2>/dev/null || true
    cp docker-compose*.yml "$BACKUP_DIR/config/" 2>/dev/null || true
    cp package.json "$BACKUP_DIR/config/" 2>/dev/null || true
    cp backend/package.json "$BACKUP_DIR/config/backend-package.json" 2>/dev/null || true
    
    # Backup database schema
    cp database/schema.sql "$BACKUP_DIR/config/" 2>/dev/null || true
    cp database/seed.sql "$BACKUP_DIR/config/" 2>/dev/null || true
    cp database/mongo-init.js "$BACKUP_DIR/config/" 2>/dev/null || true
    
    print_success "Configuration backup completed"
}

# Function to create backup metadata
create_backup_metadata() {
    print_status "Creating backup metadata..."
    
    cat > "$BACKUP_DIR/backup_info.txt" << EOF
Seth Clinic CMS Backup Information
==================================
Backup Date: $(date)
Backup Timestamp: $TIMESTAMP
System Version: $(git describe --tags 2>/dev/null || echo "unknown")
Docker Compose Version: $(docker-compose version --short)
Git Commit: $(git rev-parse HEAD 2>/dev/null || echo "unknown")
Git Branch: $(git branch --show-current 2>/dev/null || echo "unknown")

Database Information:
- PostgreSQL: seth_clinic
- MongoDB: seth_clinic_mongo
- Redis: Default database

Backup Contents:
- PostgreSQL dump: postgres/seth_clinic.sql
- MongoDB dump: mongodb/
- Redis dump: redis/dump.rdb
- Uploads: uploads/
- Exports: exports/
- Configuration: config/

Total Backup Size: $(du -sh "$BACKUP_DIR" | cut -f1)
EOF

    print_success "Backup metadata created"
}

# Function to compress backup
compress_backup() {
    print_status "Compressing backup..."
    
    local compressed_file="$BACKUP_BASE_DIR/seth-clinic-backup-$TIMESTAMP.tar.gz"
    
    if tar -czf "$compressed_file" -C "$BACKUP_BASE_DIR" "$(basename "$BACKUP_DIR")"; then
        print_success "Backup compressed: $compressed_file"
        
        # Get compressed size
        local compressed_size=$(du -h "$compressed_file" | cut -f1)
        print_status "Compressed backup size: $compressed_size"
        
        # Remove uncompressed directory
        rm -rf "$BACKUP_DIR"
        print_status "Uncompressed backup directory removed"
    else
        print_error "Backup compression failed"
        return 1
    fi
}

# Function to clean old backups
clean_old_backups() {
    print_status "Cleaning old backups (older than $RETENTION_DAYS days)..."
    
    local old_backups=$(find "$BACKUP_BASE_DIR" -name "seth-clinic-backup-*.tar.gz" -type f -mtime +$RETENTION_DAYS)
    
    if [ -n "$old_backups" ]; then
        echo "$old_backups" | while read -r backup; do
            print_status "Removing old backup: $(basename "$backup")"
            rm -f "$backup"
        done
        print_success "Old backups cleaned"
    else
        print_status "No old backups to clean"
    fi
}

# Function to restore from backup
restore_from_backup() {
    local backup_file=$1
    
    if [ -z "$backup_file" ]; then
        print_error "Backup file not specified"
        echo "Usage: $0 restore <backup_file>"
        exit 1
    fi
    
    if [ ! -f "$backup_file" ]; then
        print_error "Backup file not found: $backup_file"
        exit 1
    fi
    
    print_status "Restoring from backup: $backup_file"
    
    # Extract backup
    local restore_dir="$BACKUP_BASE_DIR/restore-$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$restore_dir"
    
    if tar -xzf "$backup_file" -C "$restore_dir"; then
        print_success "Backup extracted to: $restore_dir"
        
        # Find the actual backup directory
        local backup_data_dir=$(find "$restore_dir" -name "seth-clinic-backup-*" -type d | head -1)
        
        if [ -z "$backup_data_dir" ]; then
            print_error "Could not find backup data directory"
            exit 1
        fi
        
        print_status "Restoring PostgreSQL..."
        if [ -f "$backup_data_dir/postgres/seth_clinic.sql" ]; then
            docker-compose exec -T postgres psql -U postgres -d seth_clinic < "$backup_data_dir/postgres/seth_clinic.sql"
            print_success "PostgreSQL restored"
        else
            print_warning "PostgreSQL backup file not found"
        fi
        
        print_status "Restoring MongoDB..."
        if [ -d "$backup_data_dir/mongodb" ]; then
            docker-compose exec -T mongodb mongorestore --db seth_clinic_mongo "$backup_data_dir/mongodb/seth_clinic_mongo/"
            print_success "MongoDB restored"
        else
            print_warning "MongoDB backup directory not found"
        fi
        
        print_status "Restoring Redis..."
        if [ -f "$backup_data_dir/redis/dump.rdb" ]; then
            docker cp "$backup_data_dir/redis/dump.rdb" seth-clinic-redis:/data/dump.rdb
            docker-compose restart redis
            print_success "Redis restored"
        else
            print_warning "Redis backup file not found"
        fi
        
        print_status "Restoring uploads..."
        if [ -d "$backup_data_dir/uploads" ]; then
            docker cp "$backup_data_dir/uploads/." seth-clinic-backend:/app/uploads/
            print_success "Uploads restored"
        else
            print_warning "Uploads backup directory not found"
        fi
        
        print_status "Restoring exports..."
        if [ -d "$backup_data_dir/exports" ]; then
            docker cp "$backup_data_dir/exports/." seth-clinic-backend:/app/exports/
            print_success "Exports restored"
        else
            print_warning "Exports backup directory not found"
        fi
        
        # Clean up restore directory
        rm -rf "$restore_dir"
        print_success "Restore completed successfully"
        
    else
        print_error "Failed to extract backup file"
        exit 1
    fi
}

# Function to list available backups
list_backups() {
    print_status "Available backups:"
    
    if [ -d "$BACKUP_BASE_DIR" ]; then
        ls -la "$BACKUP_BASE_DIR"/*.tar.gz 2>/dev/null | while read -r line; do
            local file=$(echo "$line" | awk '{print $9}')
            local size=$(echo "$line" | awk '{print $5}')
            local date=$(echo "$line" | awk '{print $6, $7, $8}')
            echo "  $file ($size bytes, $date)"
        done
    else
        print_warning "No backups found"
    fi
}

# Function to show backup information
show_backup_info() {
    local backup_file=$1
    
    if [ -z "$backup_file" ]; then
        print_error "Backup file not specified"
        echo "Usage: $0 info <backup_file>"
        exit 1
    fi
    
    if [ ! -f "$backup_file" ]; then
        print_error "Backup file not found: $backup_file"
        exit 1
    fi
    
    print_status "Backup information for: $backup_file"
    
    # Extract backup info
    local restore_dir="$BACKUP_BASE_DIR/temp-info-$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$restore_dir"
    
    if tar -xzf "$backup_file" -C "$restore_dir" --wildcards "*/backup_info.txt"; then
        local info_file=$(find "$restore_dir" -name "backup_info.txt" | head -1)
        if [ -f "$info_file" ]; then
            cat "$info_file"
        else
            print_warning "Backup info file not found"
        fi
    else
        print_error "Failed to extract backup info"
    fi
    
    # Clean up
    rm -rf "$restore_dir"
}

# Main function
main() {
    case "$1" in
        "backup")
            print_status "Starting full system backup..."
            create_backup_directory
            backup_postgres
            backup_mongodb
            backup_redis
            backup_uploads
            backup_exports
            backup_config
            create_backup_metadata
            compress_backup
            clean_old_backups
            print_success "Backup completed successfully"
            ;;
        "restore")
            restore_from_backup "$2"
            ;;
        "list")
            list_backups
            ;;
        "info")
            show_backup_info "$2"
            ;;
        "clean")
            clean_old_backups
            ;;
        *)
            echo "Usage: $0 {backup|restore|list|info|clean}"
            echo ""
            echo "Commands:"
            echo "  backup              - Create a full system backup"
            echo "  restore <file>      - Restore from backup file"
            echo "  list                - List available backups"
            echo "  info <file>         - Show backup information"
            echo "  clean               - Clean old backups"
            echo ""
            echo "Examples:"
            echo "  $0 backup"
            echo "  $0 restore ./backups/seth-clinic-backup-20240101_120000.tar.gz"
            echo "  $0 list"
            echo "  $0 info ./backups/seth-clinic-backup-20240101_120000.tar.gz"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
