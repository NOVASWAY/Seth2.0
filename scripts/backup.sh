#!/bin/bash

# Seth Medical Clinic - Database Backup Script
set -e

# Configuration
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="seth_clinic_backup_${DATE}.sql"
RETENTION_DAYS=30

# Load environment variables
if [ -f .env.production ]; then
    export $(cat .env.production | grep -v '^#' | xargs)
fi

# Create backup directory
mkdir -p $BACKUP_DIR

echo "🏥 Seth Medical Clinic - Database Backup"
echo "======================================="
echo "Backup file: $BACKUP_FILE"

# Create database backup
docker-compose -f docker-compose.prod.yml exec -T postgres pg_dump \
    -U ${POSTGRES_USER:-postgres} \
    -d ${POSTGRES_DB:-seth_clinic} \
    --clean --if-exists --create \
    > "$BACKUP_DIR/$BACKUP_FILE"

# Compress backup
gzip "$BACKUP_DIR/$BACKUP_FILE"
BACKUP_FILE="${BACKUP_FILE}.gz"

echo "✅ Backup created: $BACKUP_DIR/$BACKUP_FILE"

# Calculate backup size
BACKUP_SIZE=$(du -h "$BACKUP_DIR/$BACKUP_FILE" | cut -f1)
echo "📦 Backup size: $BACKUP_SIZE"

# Clean up old backups
echo "🧹 Cleaning up backups older than $RETENTION_DAYS days..."
find $BACKUP_DIR -name "seth_clinic_backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete

# List remaining backups
echo "📋 Available backups:"
ls -lh $BACKUP_DIR/seth_clinic_backup_*.sql.gz 2>/dev/null || echo "No backups found"

echo "✅ Backup completed successfully!"
