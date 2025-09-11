#!/bin/bash

# =============================================================================
# Seth Medical Clinic CMS - Unified Health Monitoring System
# =============================================================================
# This script provides comprehensive health monitoring for all system components
# with automatic alerting and detailed reporting.

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
LOG_FILE="/var/log/seth-clinic-health.log"
ALERT_EMAIL="admin@sethclinic.com"
HEALTH_REPORT_FILE="$PROJECT_ROOT/health-report.json"

# Thresholds
CPU_THRESHOLD=80
MEMORY_THRESHOLD=85
DISK_THRESHOLD=90
RESPONSE_TIME_THRESHOLD=5000
DB_CONNECTION_THRESHOLD=100

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
    echo -e "${PURPLE}🔍 $1${NC}"
}

# =============================================================================
# System Resource Monitoring
# =============================================================================

check_system_resources() {
    log_header "Checking System Resources"
    
    local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1 | cut -d',' -f1)
    local memory_info=$(free -m)
    local memory_usage=$(echo "$memory_info" | awk 'NR==2{printf "%.0f", $3/$2 * 100.0}')
    local disk_usage=$(df / | tail -1 | awk '{print $5}' | cut -d'%' -f1)
    local load_average=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | cut -d',' -f1)
    
    # Create resource report
    local resource_report=$(cat << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "system_resources": {
    "cpu_usage_percent": $cpu_usage,
    "memory_usage_percent": $memory_usage,
    "disk_usage_percent": $disk_usage,
    "load_average": $load_average,
    "status": "healthy"
  }
}
EOF
)
    
    # Check thresholds
    local alerts=()
    
    if (( $(echo "$cpu_usage > $CPU_THRESHOLD" | bc -l) )); then
        alerts+=("High CPU usage: ${cpu_usage}%")
        resource_report=$(echo "$resource_report" | jq '.system_resources.status = "warning"')
    fi
    
    if (( memory_usage > MEMORY_THRESHOLD )); then
        alerts+=("High memory usage: ${memory_usage}%")
        resource_report=$(echo "$resource_report" | jq '.system_resources.status = "warning"')
    fi
    
    if (( disk_usage > DISK_THRESHOLD )); then
        alerts+=("High disk usage: ${disk_usage}%")
        resource_report=$(echo "$resource_report" | jq '.system_resources.status = "warning"')
    fi
    
    # Log results
    log_info "CPU Usage: ${cpu_usage}%"
    log_info "Memory Usage: ${memory_usage}%"
    log_info "Disk Usage: ${disk_usage}%"
    log_info "Load Average: $load_average"
    
    if [ ${#alerts[@]} -eq 0 ]; then
        log_success "System resources are healthy"
    else
        for alert in "${alerts[@]}"; do
            log_warning "$alert"
        done
    fi
    
    echo "$resource_report"
}

# =============================================================================
# Database Health Check
# =============================================================================

check_database_health() {
    log_header "Checking Database Health"
    
    local db_status="healthy"
    local db_response_time=0
    local db_connections=0
    local db_size=0
    
    # Check if PostgreSQL is running
    if ! docker-compose -f "$PROJECT_ROOT/docker-compose.yml" ps postgres | grep -q "Up"; then
        log_error "PostgreSQL container is not running"
        db_status="unhealthy"
    else
        # Check database connection
        local start_time=$(date +%s%3N)
        if docker-compose -f "$PROJECT_ROOT/docker-compose.yml" exec -T postgres pg_isready -U postgres >/dev/null 2>&1; then
            local end_time=$(date +%s%3N)
            db_response_time=$((end_time - start_time))
            log_success "Database connection successful (${db_response_time}ms)"
        else
            log_error "Database connection failed"
            db_status="unhealthy"
        fi
        
        # Get database statistics
        if [ "$db_status" = "healthy" ]; then
            db_connections=$(docker-compose -f "$PROJECT_ROOT/docker-compose.yml" exec -T postgres psql -U postgres -d seth_clinic -t -c "SELECT count(*) FROM pg_stat_activity;" 2>/dev/null | tr -d ' ' || echo "0")
            db_size=$(docker-compose -f "$PROJECT_ROOT/docker-compose.yml" exec -T postgres psql -U postgres -d seth_clinic -t -c "SELECT pg_size_pretty(pg_database_size('seth_clinic'));" 2>/dev/null | tr -d ' ' || echo "0")
        fi
    fi
    
    # Create database report
    local db_report=$(cat << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "database": {
    "status": "$db_status",
    "response_time_ms": $db_response_time,
    "active_connections": $db_connections,
    "database_size": "$db_size"
  }
}
EOF
)
    
    echo "$db_report"
}

# =============================================================================
# Redis Health Check
# =============================================================================

check_redis_health() {
    log_header "Checking Redis Health"
    
    local redis_status="healthy"
    local redis_response_time=0
    local redis_memory_usage=0
    local redis_connected_clients=0
    
    # Check if Redis is running
    if ! docker-compose -f "$PROJECT_ROOT/docker-compose.yml" ps redis | grep -q "Up"; then
        log_error "Redis container is not running"
        redis_status="unhealthy"
    else
        # Check Redis connection
        local start_time=$(date +%s%3N)
        if docker-compose -f "$PROJECT_ROOT/docker-compose.yml" exec -T redis redis-cli ping >/dev/null 2>&1; then
            local end_time=$(date +%s%3N)
            redis_response_time=$((end_time - start_time))
            log_success "Redis connection successful (${redis_response_time}ms)"
            
            # Get Redis statistics
            redis_memory_usage=$(docker-compose -f "$PROJECT_ROOT/docker-compose.yml" exec -T redis redis-cli info memory | grep used_memory_human | cut -d: -f2 | tr -d '\r' || echo "0")
            redis_connected_clients=$(docker-compose -f "$PROJECT_ROOT/docker-compose.yml" exec -T redis redis-cli info clients | grep connected_clients | cut -d: -f2 | tr -d '\r' || echo "0")
        else
            log_error "Redis connection failed"
            redis_status="unhealthy"
        fi
    fi
    
    # Create Redis report
    local redis_report=$(cat << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "redis": {
    "status": "$redis_status",
    "response_time_ms": $redis_response_time,
    "memory_usage": "$redis_memory_usage",
    "connected_clients": $redis_connected_clients
  }
}
EOF
)
    
    echo "$redis_report"
}

# =============================================================================
# Application Health Check
# =============================================================================

check_application_health() {
    log_header "Checking Application Health"
    
    local backend_status="healthy"
    local frontend_status="healthy"
    local backend_response_time=0
    local frontend_response_time=0
    
    # Check Backend API
    if ! docker-compose -f "$PROJECT_ROOT/docker-compose.yml" ps backend | grep -q "Up"; then
        log_error "Backend container is not running"
        backend_status="unhealthy"
    else
        local start_time=$(date +%s%3N)
        local http_code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:5000/health" 2>/dev/null || echo "000")
        local end_time=$(date +%s%3N)
        backend_response_time=$((end_time - start_time))
        
        if [ "$http_code" = "200" ]; then
            log_success "Backend API is healthy (${backend_response_time}ms)"
        else
            log_error "Backend API health check failed (HTTP $http_code)"
            backend_status="unhealthy"
        fi
    fi
    
    # Check Frontend
    if ! docker-compose -f "$PROJECT_ROOT/docker-compose.yml" ps frontend | grep -q "Up"; then
        log_error "Frontend container is not running"
        frontend_status="unhealthy"
    else
        local start_time=$(date +%s%3N)
        local http_code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/api/health" 2>/dev/null || echo "000")
        local end_time=$(date +%s%3N)
        frontend_response_time=$((end_time - start_time))
        
        if [ "$http_code" = "200" ]; then
            log_success "Frontend is healthy (${frontend_response_time}ms)"
        else
            log_error "Frontend health check failed (HTTP $http_code)"
            frontend_status="unhealthy"
        fi
    fi
    
    # Create application report
    local app_report=$(cat << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "application": {
    "backend": {
      "status": "$backend_status",
      "response_time_ms": $backend_response_time
    },
    "frontend": {
      "status": "$frontend_status",
      "response_time_ms": $frontend_response_time
    }
  }
}
EOF
)
    
    echo "$app_report"
}

# =============================================================================
# External Services Health Check
# =============================================================================

check_external_services() {
    log_header "Checking External Services"
    
    local mpesa_status="unknown"
    local sha_status="unknown"
    local mpesa_response_time=0
    local sha_response_time=0
    
    # Check M-Pesa API (if configured)
    if [ -n "$MPESA_CONSUMER_KEY" ] && [ "$MPESA_CONSUMER_KEY" != "your_consumer_key_here" ]; then
        local start_time=$(date +%s%3N)
        local http_code=$(curl -s -o /dev/null -w "%{http_code}" "https://sandbox.safaricom.co.ke/oauth/v1/generate" 2>/dev/null || echo "000")
        local end_time=$(date +%s%3N)
        mpesa_response_time=$((end_time - start_time))
        
        if [ "$http_code" = "200" ] || [ "$http_code" = "400" ]; then
            mpesa_status="healthy"
            log_success "M-Pesa API is accessible (${mpesa_response_time}ms)"
        else
            mpesa_status="unhealthy"
            log_warning "M-Pesa API check failed (HTTP $http_code)"
        fi
    else
        log_info "M-Pesa API not configured"
    fi
    
    # Check SHA API (if configured)
    if [ -n "$SHA_API_KEY" ] && [ "$SHA_API_KEY" != "your_sha_api_key_here" ]; then
        local start_time=$(date +%s%3N)
        local http_code=$(curl -s -o /dev/null -w "%{http_code}" "$SHA_API_URL" 2>/dev/null || echo "000")
        local end_time=$(date +%s%3N)
        sha_response_time=$((end_time - start_time))
        
        if [ "$http_code" = "200" ] || [ "$http_code" = "401" ]; then
            sha_status="healthy"
            log_success "SHA API is accessible (${sha_response_time}ms)"
        else
            sha_status="unhealthy"
            log_warning "SHA API check failed (HTTP $http_code)"
        fi
    else
        log_info "SHA API not configured"
    fi
    
    # Create external services report
    local external_report=$(cat << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "external_services": {
    "mpesa": {
      "status": "$mpesa_status",
      "response_time_ms": $mpesa_response_time
    },
    "sha": {
      "status": "$sha_status",
      "response_time_ms": $sha_response_time
    }
  }
}
EOF
)
    
    echo "$external_report"
}

# =============================================================================
# Generate Health Report
# =============================================================================

generate_health_report() {
    log_header "Generating Health Report"
    
    # Load environment variables
    if [ -f "$PROJECT_ROOT/.env.production" ]; then
        export $(cat "$PROJECT_ROOT/.env.production" | grep -v '^#' | xargs)
    elif [ -f "$PROJECT_ROOT/.env" ]; then
        export $(cat "$PROJECT_ROOT/.env" | grep -v '^#' | xargs)
    fi
    
    # Collect all health data
    local system_resources=$(check_system_resources)
    local database=$(check_database_health)
    local redis=$(check_redis_health)
    local application=$(check_application_health)
    local external_services=$(check_external_services)
    
    # Combine all reports
    local health_report=$(cat << EOF
{
  "system_health": {
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "overall_status": "healthy",
    "checks": [
      $system_resources,
      $database,
      $redis,
      $application,
      $external_services
    ]
  }
}
EOF
)
    
    # Determine overall status
    local overall_status="healthy"
    if echo "$health_report" | jq -e '.system_health.checks[].system_resources.status == "warning"' >/dev/null 2>&1; then
        overall_status="warning"
    fi
    if echo "$health_report" | jq -e '.system_health.checks[].database.status == "unhealthy"' >/dev/null 2>&1; then
        overall_status="unhealthy"
    fi
    if echo "$health_report" | jq -e '.system_health.checks[].redis.status == "unhealthy"' >/dev/null 2>&1; then
        overall_status="unhealthy"
    fi
    if echo "$health_report" | jq -e '.system_health.checks[].application.backend.status == "unhealthy"' >/dev/null 2>&1; then
        overall_status="unhealthy"
    fi
    if echo "$health_report" | jq -e '.system_health.checks[].application.frontend.status == "unhealthy"' >/dev/null 2>&1; then
        overall_status="unhealthy"
    fi
    
    # Update overall status
    health_report=$(echo "$health_report" | jq ".system_health.overall_status = \"$overall_status\"")
    
    # Save report
    echo "$health_report" > "$HEALTH_REPORT_FILE"
    
    # Log overall status
    case $overall_status in
        "healthy")
            log_success "System health check completed - All systems healthy"
            ;;
        "warning")
            log_warning "System health check completed - Some warnings detected"
            ;;
        "unhealthy")
            log_error "System health check completed - Critical issues detected"
            ;;
    esac
    
    echo "$health_report"
}

# =============================================================================
# Send Alerts
# =============================================================================

send_alerts() {
    local health_report="$1"
    local overall_status=$(echo "$health_report" | jq -r '.system_health.overall_status')
    
    if [ "$overall_status" = "unhealthy" ]; then
        log_warning "Sending critical alert..."
        
        # Create alert message
        local alert_message=$(cat << EOF
Subject: CRITICAL: Seth Medical Clinic CMS Health Alert

System Status: $overall_status
Timestamp: $(date)
Report: $HEALTH_REPORT_FILE

Please check the system immediately.

---
Seth Medical Clinic CMS Monitoring System
EOF
)
        
        # Send email alert (if mail is configured)
        if command -v mail >/dev/null 2>&1; then
            echo "$alert_message" | mail -s "CRITICAL: Seth Medical Clinic CMS Health Alert" "$ALERT_EMAIL" 2>/dev/null || log_warning "Failed to send email alert"
        fi
        
        # Log critical alert
        log_error "CRITICAL ALERT: System health is unhealthy"
    fi
}

# =============================================================================
# Main Health Check Function
# =============================================================================

main() {
    log_header "Starting System Health Check"
    
    # Create log directory if it doesn't exist
    mkdir -p "$(dirname "$LOG_FILE")"
    
    # Generate health report
    local health_report=$(generate_health_report)
    
    # Send alerts if necessary
    send_alerts "$health_report"
    
    # Display summary
    local overall_status=$(echo "$health_report" | jq -r '.system_health.overall_status')
    echo ""
    log_header "Health Check Summary"
    echo "Overall Status: $overall_status"
    echo "Report saved to: $HEALTH_REPORT_FILE"
    echo "Log saved to: $LOG_FILE"
    echo ""
    
    # Return appropriate exit code
    case $overall_status in
        "healthy")
            exit 0
            ;;
        "warning")
            exit 1
            ;;
        "unhealthy")
            exit 2
            ;;
    esac
}

# =============================================================================
# Command Line Interface
# =============================================================================

show_help() {
    echo "Seth Medical Clinic CMS - Health Monitoring System"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -h, --help     Show this help message"
    echo "  -q, --quiet    Quiet mode (minimal output)"
    echo "  -j, --json     Output JSON report only"
    echo "  -a, --alert    Send alerts even for warnings"
    echo ""
    echo "Exit Codes:"
    echo "  0 - All systems healthy"
    echo "  1 - Warnings detected"
    echo "  2 - Critical issues detected"
    echo ""
}

# Parse command line arguments
QUIET=false
JSON_ONLY=false
ALERT_WARNINGS=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -q|--quiet)
            QUIET=true
            shift
            ;;
        -j|--json)
            JSON_ONLY=true
            shift
            ;;
        -a|--alert)
            ALERT_WARNINGS=true
            shift
            ;;
        *)
            log_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Execute main function
if [ "$JSON_ONLY" = true ]; then
    generate_health_report | jq '.'
else
    main
fi
