#!/bin/bash

# Comprehensive monitoring script for Seth Clinic CMS Sorting System
# This script monitors all aspects of the sorting system and provides alerts

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
ALERT_EMAIL=${ALERT_EMAIL:-"admin@sethclinic.com"}
LOG_FILE="./logs/sorting-system-monitor.log"
ALERT_THRESHOLD_CPU=80
ALERT_THRESHOLD_MEMORY=85
ALERT_THRESHOLD_DISK=90
ALERT_THRESHOLD_RESPONSE_TIME=5000

# Create logs directory if it doesn't exist
mkdir -p logs

# Function to log with timestamp
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
    log_message "INFO: $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
    log_message "SUCCESS: $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
    log_message "WARNING: $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
    log_message "ERROR: $1"
}

print_alert() {
    echo -e "${PURPLE}[ALERT]${NC} $1"
    log_message "ALERT: $1"
}

# Function to check service health
check_service_health() {
    local service_name=$1
    local health_url=$2
    
    if curl -f "$health_url" > /dev/null 2>&1; then
        print_success "$service_name is healthy"
        return 0
    else
        print_error "$service_name is unhealthy"
        return 1
    fi
}

# Function to check database performance
check_database_performance() {
    print_status "Checking database performance..."
    
    # PostgreSQL performance
    local pg_connections=$(docker-compose exec -T postgres psql -U postgres -d seth_clinic -t -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';" 2>/dev/null | tr -d ' ' || echo "0")
    local pg_max_connections=$(docker-compose exec -T postgres psql -U postgres -d seth_clinic -t -c "SHOW max_connections;" 2>/dev/null | tr -d ' ' || echo "100")
    local pg_connection_usage=$((pg_connections * 100 / pg_max_connections))
    
    if [ "$pg_connection_usage" -gt 80 ]; then
        print_alert "PostgreSQL connection usage is high: ${pg_connection_usage}%"
    else
        print_success "PostgreSQL connection usage: ${pg_connection_usage}%"
    fi
    
    # Redis performance
    local redis_memory=$(docker-compose exec -T redis redis-cli info memory | grep used_memory_human | cut -d: -f2 | tr -d '\r' || echo "0B")
    print_status "Redis memory usage: $redis_memory"
    
    # MongoDB performance
    local mongo_collections=$(docker-compose exec -T mongodb mongosh --eval "db.stats().collections" --quiet 2>/dev/null || echo "0")
    print_status "MongoDB collections: $mongo_collections"
}

# Function to check sorting system performance
check_sorting_performance() {
    print_status "Checking sorting system performance..."
    
    local api_base="http://localhost:5000/api"
    
    # Test patient sorting performance
    local patient_sort_time=$(time (curl -s "$api_base/patients?sortBy=firstName&sortDirection=asc&limit=100" > /dev/null) 2>&1 | grep real | awk '{print $2}' | sed 's/[^0-9.]//g' || echo "0")
    local patient_sort_ms=$(echo "$patient_sort_time * 1000" | bc 2>/dev/null || echo "0")
    
    if (( $(echo "$patient_sort_ms > $ALERT_THRESHOLD_RESPONSE_TIME" | bc -l) )); then
        print_alert "Patient sorting is slow: ${patient_sort_ms}ms"
    else
        print_success "Patient sorting performance: ${patient_sort_ms}ms"
    fi
    
    # Test visit sorting performance
    local visit_sort_time=$(time (curl -s "$api_base/visits?sortBy=visitDate&sortDirection=desc&limit=100" > /dev/null) 2>&1 | grep real | awk '{print $2}' | sed 's/[^0-9.]//g' || echo "0")
    local visit_sort_ms=$(echo "$visit_sort_time * 1000" | bc 2>/dev/null || echo "0")
    
    if (( $(echo "$visit_sort_ms > $ALERT_THRESHOLD_RESPONSE_TIME" | bc -l) )); then
        print_alert "Visit sorting is slow: ${visit_sort_ms}ms"
    else
        print_success "Visit sorting performance: ${visit_sort_ms}ms"
    fi
    
    # Test SHA claims sorting performance
    local claims_sort_time=$(time (curl -s "$api_base/sha-claims?sortBy=createdAt&sortDirection=desc&limit=100" > /dev/null) 2>&1 | grep real | awk '{print $2}' | sed 's/[^0-9.]//g' || echo "0")
    local claims_sort_ms=$(echo "$claims_sort_time * 1000" | bc 2>/dev/null || echo "0")
    
    if (( $(echo "$claims_sort_ms > $ALERT_THRESHOLD_RESPONSE_TIME" | bc -l) )); then
        print_alert "SHA claims sorting is slow: ${claims_sort_ms}ms"
    else
        print_success "SHA claims sorting performance: ${claims_sort_ms}ms"
    fi
}

# Function to check system resources
check_system_resources() {
    print_status "Checking system resources..."
    
    # CPU usage
    local cpu_usage=$(docker stats --no-stream --format "{{.CPUPerc}}" seth-clinic-backend 2>/dev/null | sed 's/%//' || echo "0")
    if (( $(echo "$cpu_usage > $ALERT_THRESHOLD_CPU" | bc -l) )); then
        print_alert "High CPU usage: ${cpu_usage}%"
    else
        print_success "CPU usage: ${cpu_usage}%"
    fi
    
    # Memory usage
    local memory_usage=$(docker stats --no-stream --format "{{.MemPerc}}" seth-clinic-backend 2>/dev/null | sed 's/%//' || echo "0")
    if (( $(echo "$memory_usage > $ALERT_THRESHOLD_MEMORY" | bc -l) )); then
        print_alert "High memory usage: ${memory_usage}%"
    else
        print_success "Memory usage: ${memory_usage}%"
    fi
    
    # Disk usage
    local disk_usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//' || echo "0")
    if [ "$disk_usage" -gt "$ALERT_THRESHOLD_DISK" ]; then
        print_alert "High disk usage: ${disk_usage}%"
    else
        print_success "Disk usage: ${disk_usage}%"
    fi
}

# Function to check container status
check_container_status() {
    print_status "Checking container status..."
    
    local containers=("seth-clinic-db" "seth-clinic-redis" "seth-clinic-mongodb" "seth-clinic-backend" "seth-clinic-worker" "seth-clinic-frontend")
    
    for container in "${containers[@]}"; do
        if docker ps --format "{{.Names}}" | grep -q "^${container}$"; then
            local status=$(docker ps --format "{{.Status}}" --filter "name=${container}")
            print_success "$container: $status"
        else
            print_error "$container is not running"
        fi
    done
}

# Function to check logs for errors
check_error_logs() {
    print_status "Checking for errors in logs..."
    
    local error_count=$(docker-compose logs --tail=100 2>&1 | grep -i error | wc -l)
    if [ "$error_count" -gt 0 ]; then
        print_warning "Found $error_count errors in recent logs"
        docker-compose logs --tail=100 2>&1 | grep -i error | tail -5
    else
        print_success "No recent errors found in logs"
    fi
}

# Function to generate performance report
generate_performance_report() {
    local report_file="./logs/performance-report-$(date +%Y%m%d-%H%M%S).txt"
    
    print_status "Generating performance report: $report_file"
    
    {
        echo "Seth Clinic CMS - Sorting System Performance Report"
        echo "Generated: $(date)"
        echo "=================================================="
        echo ""
        
        echo "Container Status:"
        docker-compose ps
        echo ""
        
        echo "Resource Usage:"
        docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}\t{{.NetIO}}\t{{.BlockIO}}"
        echo ""
        
        echo "Database Performance:"
        echo "PostgreSQL connections:"
        docker-compose exec -T postgres psql -U postgres -d seth_clinic -c "SELECT count(*) as active_connections FROM pg_stat_activity WHERE state = 'active';" 2>/dev/null || echo "Unable to connect"
        echo ""
        
        echo "Redis memory usage:"
        docker-compose exec -T redis redis-cli info memory | grep used_memory_human || echo "Unable to connect"
        echo ""
        
        echo "MongoDB stats:"
        docker-compose exec -T mongodb mongosh --eval "db.stats()" 2>/dev/null || echo "Unable to connect"
        echo ""
        
        echo "Sorting System Performance:"
        echo "Patient sorting (100 records):"
        time curl -s "http://localhost:5000/api/patients?limit=100&sortBy=firstName" > /dev/null 2>&1 || echo "Failed"
        echo ""
        
        echo "Visit sorting (100 records):"
        time curl -s "http://localhost:5000/api/visits?limit=100&sortBy=visitDate" > /dev/null 2>&1 || echo "Failed"
        echo ""
        
        echo "SHA claims sorting (100 records):"
        time curl -s "http://localhost:5000/api/sha-claims?limit=100&sortBy=createdAt" > /dev/null 2>&1 || echo "Failed"
        echo ""
        
        echo "Recent Errors:"
        docker-compose logs --tail=50 2>&1 | grep -i error || echo "No recent errors"
        
    } > "$report_file"
    
    print_success "Performance report generated: $report_file"
}

# Function to send alert (placeholder for email/SMS integration)
send_alert() {
    local message=$1
    print_alert "ALERT: $message"
    
    # Here you would integrate with your alerting system
    # For example: send email, SMS, Slack notification, etc.
    # echo "$message" | mail -s "Seth Clinic CMS Alert" "$ALERT_EMAIL"
}

# Main monitoring function
main() {
    print_status "Starting Seth Clinic CMS Sorting System monitoring..."
    
    # Check if Docker is running
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running"
        exit 1
    fi
    
    # Check if Docker Compose is available
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not available"
        exit 1
    fi
    
    # Run all checks
    check_container_status
    check_service_health "Backend" "http://localhost:5000/health"
    check_service_health "Frontend" "http://localhost:3000/api/health"
    check_database_performance
    check_sorting_performance
    check_system_resources
    check_error_logs
    
    # Generate performance report
    generate_performance_report
    
    print_success "Monitoring completed successfully"
}

# Run main function
main "$@"
