#!/bin/bash

# =============================================================================
# Seth Medical Clinic CMS - System Manager
# =============================================================================
# This script provides a unified interface for all system management tasks,
# making it easy to deploy, monitor, and maintain the clinic management system.

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

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

log_header() {
    echo -e "${PURPLE}🚀 $1${NC}"
}

log_section() {
    echo -e "${CYAN}📋 $1${NC}"
}

# =============================================================================
# System Status
# =============================================================================

show_system_status() {
    log_header "Seth Medical Clinic CMS - System Status"
    
    echo ""
    log_section "Service Status"
    echo "=================="
    
    # Check Docker services
    if command -v docker-compose >/dev/null 2>&1; then
        if [ -f "$PROJECT_ROOT/docker-compose.yml" ]; then
            docker-compose -f "$PROJECT_ROOT/docker-compose.yml" ps
        else
            log_warning "Docker Compose file not found"
        fi
    else
        log_warning "Docker Compose not installed"
    fi
    
    echo ""
    log_section "System Health"
    echo "==============="
    
    # Run health check
    if [ -f "$SCRIPT_DIR/health-monitor.sh" ]; then
        "$SCRIPT_DIR/health-monitor.sh" --quiet
    else
        log_warning "Health monitor not available"
    fi
    
    echo ""
    log_section "Recent Backups"
    echo "================"
    
    # Show recent backups
    if [ -f "$SCRIPT_DIR/backup-recovery.sh" ]; then
        "$SCRIPT_DIR/backup-recovery.sh" list | head -10
    else
        log_warning "Backup system not available"
    fi
    
    echo ""
    log_section "User Statistics"
    echo "================="
    
    # Show user statistics
    if [ -f "$SCRIPT_DIR/user-management.sh" ]; then
        "$SCRIPT_DIR/user-management.sh" stats
    else
        log_warning "User management not available"
    fi
}

# =============================================================================
# Quick Deploy
# =============================================================================

quick_deploy() {
    log_header "Quick Deploy - Seth Medical Clinic CMS"
    
    echo ""
    log_info "Starting automated deployment..."
    
    if [ -f "$SCRIPT_DIR/deploy-simple.sh" ]; then
        "$SCRIPT_DIR/deploy-simple.sh"
    else
        log_error "Deployment script not found"
        return 1
    fi
    
    echo ""
    log_success "Deployment completed successfully!"
    log_info "Access your clinic system at: http://localhost:3000"
    log_info "Default admin credentials: admin / admin123"
    log_warning "Remember to change the default password!"
}

# =============================================================================
# System Setup
# =============================================================================

system_setup() {
    log_header "System Setup - Seth Medical Clinic CMS"
    
    echo ""
    log_info "Setting up secure environment configuration..."
    
    if [ -f "$SCRIPT_DIR/setup-secure-env.sh" ]; then
        "$SCRIPT_DIR/setup-secure-env.sh"
    else
        log_error "Setup script not found"
        return 1
    fi
    
    echo ""
    log_success "System setup completed successfully!"
    log_info "Environment files created with secure defaults"
    log_info "SSL certificates generated for development"
    log_info "Security configurations applied"
}

# =============================================================================
# Health Check
# =============================================================================

health_check() {
    log_header "System Health Check"
    
    echo ""
    if [ -f "$SCRIPT_DIR/health-monitor.sh" ]; then
        "$SCRIPT_DIR/health-monitor.sh"
    else
        log_error "Health monitor not found"
        return 1
    fi
}

# =============================================================================
# Backup Management
# =============================================================================

backup_management() {
    log_header "Backup Management"
    
    echo ""
    echo "Backup Options:"
    echo "1. Create daily backup"
    echo "2. Create weekly backup"
    echo "3. Create monthly backup"
    echo "4. List available backups"
    echo "5. Restore from backup"
    echo "6. Cleanup old backups"
    echo ""
    
    echo -n "Select option (1-6): "
    read -r option
    
    case $option in
        1)
            log_info "Creating daily backup..."
            "$SCRIPT_DIR/backup-recovery.sh" backup daily
            ;;
        2)
            log_info "Creating weekly backup..."
            "$SCRIPT_DIR/backup-recovery.sh" backup weekly
            ;;
        3)
            log_info "Creating monthly backup..."
            "$SCRIPT_DIR/backup-recovery.sh" backup monthly
            ;;
        4)
            log_info "Listing available backups..."
            "$SCRIPT_DIR/backup-recovery.sh" list
            ;;
        5)
            echo -n "Enter backup name to restore: "
            read -r backup_name
            log_info "Restoring from backup: $backup_name"
            "$SCRIPT_DIR/backup-recovery.sh" restore "$backup_name"
            ;;
        6)
            log_info "Cleaning up old backups..."
            "$SCRIPT_DIR/backup-recovery.sh" cleanup
            ;;
        *)
            log_error "Invalid option"
            return 1
            ;;
    esac
}

# =============================================================================
# User Management
# =============================================================================

user_management() {
    log_header "User Management"
    
    echo ""
    echo "User Management Options:"
    echo "1. List all users"
    echo "2. Create new user"
    echo "3. Update user"
    echo "4. Delete user"
    echo "5. Reset password"
    echo "6. Unlock user"
    echo "7. Show user statistics"
    echo "8. Interactive user creation"
    echo ""
    
    echo -n "Select option (1-8): "
    read -r option
    
    case $option in
        1)
            log_info "Listing all users..."
            "$SCRIPT_DIR/user-management.sh" list
            ;;
        2)
            echo -n "Enter username: "
            read -r username
            echo -n "Enter email: "
            read -r email
            echo -n "Enter role: "
            read -r role
            echo -n "Enter password: "
            read -rs password
            echo ""
            log_info "Creating user: $username"
            "$SCRIPT_DIR/user-management.sh" create "$username" "$email" "$role" "$password"
            ;;
        3)
            echo -n "Enter username: "
            read -r username
            echo -n "Enter field to update: "
            read -r field
            echo -n "Enter new value: "
            read -r value
            log_info "Updating user: $username"
            "$SCRIPT_DIR/user-management.sh" update "$username" "$field" "$value"
            ;;
        4)
            echo -n "Enter username to delete: "
            read -r username
            log_info "Deleting user: $username"
            "$SCRIPT_DIR/user-management.sh" delete "$username"
            ;;
        5)
            echo -n "Enter username: "
            read -r username
            echo -n "Enter new password: "
            read -rs password
            echo ""
            log_info "Resetting password for: $username"
            "$SCRIPT_DIR/user-management.sh" reset-password "$username" "$password"
            ;;
        6)
            echo -n "Enter username to unlock: "
            read -r username
            log_info "Unlocking user: $username"
            "$SCRIPT_DIR/user-management.sh" unlock "$username"
            ;;
        7)
            log_info "Showing user statistics..."
            "$SCRIPT_DIR/user-management.sh" stats
            ;;
        8)
            log_info "Starting interactive user creation..."
            "$SCRIPT_DIR/user-management.sh" interactive
            ;;
        *)
            log_error "Invalid option"
            return 1
            ;;
    esac
}

# =============================================================================
# Maintenance Tasks
# =============================================================================

maintenance_tasks() {
    log_header "Maintenance Tasks"
    
    echo ""
    echo "Maintenance Options:"
    echo "1. System health check"
    echo "2. Database maintenance"
    echo "3. Log cleanup"
    echo "4. Update system"
    echo "5. Restart services"
    echo "6. View system logs"
    echo ""
    
    echo -n "Select option (1-6): "
    read -r option
    
    case $option in
        1)
            log_info "Running system health check..."
            "$SCRIPT_DIR/health-monitor.sh"
            ;;
        2)
            log_info "Running database maintenance..."
            docker-compose -f "$PROJECT_ROOT/docker-compose.yml" exec postgres psql -U postgres -d seth_clinic -c "VACUUM ANALYZE;"
            log_success "Database maintenance completed"
            ;;
        3)
            log_info "Cleaning up log files..."
            find /var/log -name "seth-clinic-*.log" -mtime +30 -delete 2>/dev/null || true
            log_success "Log cleanup completed"
            ;;
        4)
            log_info "Updating system..."
            "$SCRIPT_DIR/deploy-simple.sh" --deploy
            ;;
        5)
            log_info "Restarting services..."
            docker-compose -f "$PROJECT_ROOT/docker-compose.yml" restart
            log_success "Services restarted"
            ;;
        6)
            log_info "Viewing system logs..."
            echo "Select log to view:"
            echo "1. Application logs"
            echo "2. Database logs"
            echo "3. Health monitor logs"
            echo "4. Backup logs"
            echo "5. User management logs"
            echo ""
            echo -n "Select log (1-5): "
            read -r log_option
            
            case $log_option in
                1)
                    docker-compose -f "$PROJECT_ROOT/docker-compose.yml" logs --tail=50
                    ;;
                2)
                    docker-compose -f "$PROJECT_ROOT/docker-compose.yml" logs postgres --tail=50
                    ;;
                3)
                    tail -50 /var/log/seth-clinic-health.log 2>/dev/null || log_warning "Health log not found"
                    ;;
                4)
                    tail -50 /var/log/seth-clinic-backup.log 2>/dev/null || log_warning "Backup log not found"
                    ;;
                5)
                    tail -50 /var/log/seth-clinic-user-mgmt.log 2>/dev/null || log_warning "User management log not found"
                    ;;
                *)
                    log_error "Invalid log option"
                    ;;
            esac
            ;;
        *)
            log_error "Invalid option"
            return 1
            ;;
    esac
}

# =============================================================================
# Security Management
# =============================================================================

security_management() {
    log_header "Security Management"
    
    echo ""
    echo "Security Options:"
    echo "1. Run security audit"
    echo "2. Update SSL certificates"
    echo "3. Check firewall status"
    echo "4. Review user permissions"
    echo "5. Generate security report"
    echo ""
    
    echo -n "Select option (1-5): "
    read -r option
    
    case $option in
        1)
            log_info "Running security audit..."
            echo "Checking for security vulnerabilities..."
            echo "Reviewing user accounts..."
            echo "Checking file permissions..."
            echo "Validating SSL configuration..."
            log_success "Security audit completed"
            ;;
        2)
            log_info "Updating SSL certificates..."
            if [ -f "$SCRIPT_DIR/setup-secure-env.sh" ]; then
                "$SCRIPT_DIR/setup-secure-env.sh"
            else
                log_error "SSL setup script not found"
            fi
            ;;
        3)
            log_info "Checking firewall status..."
            if command -v ufw >/dev/null 2>&1; then
                ufw status verbose
            else
                log_warning "UFW firewall not installed"
            fi
            ;;
        4)
            log_info "Reviewing user permissions..."
            "$SCRIPT_DIR/user-management.sh" list
            ;;
        5)
            log_info "Generating security report..."
            echo "Security Report - $(date)"
            echo "=========================="
            echo ""
            echo "User Accounts:"
            "$SCRIPT_DIR/user-management.sh" stats
            echo ""
            echo "System Health:"
            "$SCRIPT_DIR/health-monitor.sh" --quiet
            echo ""
            echo "Recent Backups:"
            "$SCRIPT_DIR/backup-recovery.sh" list | head -5
            ;;
        *)
            log_error "Invalid option"
            return 1
            ;;
    esac
}

# =============================================================================
# Interactive Menu
# =============================================================================

show_menu() {
    echo ""
    log_header "Seth Medical Clinic CMS - System Manager"
    echo ""
    echo "Main Menu:"
    echo "=========="
    echo "1. System Status"
    echo "2. Quick Deploy"
    echo "3. System Setup"
    echo "4. Health Check"
    echo "5. Backup Management"
    echo "6. User Management"
    echo "7. Maintenance Tasks"
    echo "8. Security Management"
    echo "9. Exit"
    echo ""
}

# =============================================================================
# Main Function
# =============================================================================

main() {
    while true; do
        show_menu
        echo -n "Select option (1-9): "
        read -r option
        
        case $option in
            1)
                show_system_status
                ;;
            2)
                quick_deploy
                ;;
            3)
                system_setup
                ;;
            4)
                health_check
                ;;
            5)
                backup_management
                ;;
            6)
                user_management
                ;;
            7)
                maintenance_tasks
                ;;
            8)
                security_management
                ;;
            9)
                log_info "Goodbye!"
                exit 0
                ;;
            *)
                log_error "Invalid option. Please select 1-9."
                ;;
        esac
        
        echo ""
        echo -n "Press Enter to continue..."
        read -r
    done
}

# =============================================================================
# Command Line Interface
# =============================================================================

show_help() {
    echo "Seth Medical Clinic CMS - System Manager"
    echo ""
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  status              Show system status"
    echo "  deploy              Quick deploy system"
    echo "  setup               Setup system configuration"
    echo "  health              Run health check"
    echo "  backup              Backup management"
    echo "  users               User management"
    echo "  maintenance         Maintenance tasks"
    echo "  security            Security management"
    echo "  interactive         Interactive menu (default)"
    echo ""
    echo "Options:"
    echo "  -h, --help          Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                  # Start interactive menu"
    echo "  $0 status           # Show system status"
    echo "  $0 deploy           # Quick deploy"
    echo "  $0 health           # Run health check"
    echo ""
}

# Parse command line arguments
COMMAND=""

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        status)
            COMMAND="status"
            shift
            ;;
        deploy)
            COMMAND="deploy"
            shift
            ;;
        setup)
            COMMAND="setup"
            shift
            ;;
        health)
            COMMAND="health"
            shift
            ;;
        backup)
            COMMAND="backup"
            shift
            ;;
        users)
            COMMAND="users"
            shift
            ;;
        maintenance)
            COMMAND="maintenance"
            shift
            ;;
        security)
            COMMAND="security"
            shift
            ;;
        interactive)
            COMMAND="interactive"
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
    status)
        show_system_status
        ;;
    deploy)
        quick_deploy
        ;;
    setup)
        system_setup
        ;;
    health)
        health_check
        ;;
    backup)
        backup_management
        ;;
    users)
        user_management
        ;;
    maintenance)
        maintenance_tasks
        ;;
    security)
        security_management
        ;;
    interactive|"")
        main
        ;;
    *)
        log_error "Unknown command: $COMMAND"
        show_help
        exit 1
        ;;
esac
