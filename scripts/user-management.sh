#!/bin/bash

# =============================================================================
# Seth Medical Clinic CMS - Simplified User Management System
# =============================================================================
# This script provides a simple command-line interface for managing users,
# roles, and permissions without requiring database access.

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
LOG_FILE="/var/log/seth-clinic-user-mgmt.log"

# Available roles
AVAILABLE_ROLES=("ADMIN" "RECEPTIONIST" "NURSE" "CLINICAL_OFFICER" "PHARMACIST" "INVENTORY_MANAGER" "CLAIMS_MANAGER")

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
    echo -e "${PURPLE}👤 $1${NC}"
}

# =============================================================================
# Database Connection
# =============================================================================

check_database_connection() {
    log_info "Checking database connection..."
    
    if ! docker-compose -f "$PROJECT_ROOT/docker-compose.yml" ps postgres | grep -q "Up"; then
        log_error "PostgreSQL container is not running"
        return 1
    fi
    
    if ! docker-compose -f "$PROJECT_ROOT/docker-compose.yml" exec -T postgres pg_isready -U postgres >/dev/null 2>&1; then
        log_error "Database connection failed"
        return 1
    fi
    
    log_success "Database connection established"
    return 0
}

# =============================================================================
# User List
# =============================================================================

list_users() {
    log_header "Listing All Users"
    
    if ! check_database_connection; then
        return 1
    fi
    
    echo ""
    echo "ID                                   | Username        | Role              | Status    | Last Login"
    echo "-------------------------------------|-----------------|-------------------|-----------|-------------------"
    
    docker-compose -f "$PROJECT_ROOT/docker-compose.yml" exec -T postgres psql -U postgres -d seth_clinic -t -c "
        SELECT 
            id,
            username,
            role,
            CASE 
                WHEN is_active = true THEN 'Active'
                ELSE 'Inactive'
            END as status,
            COALESCE(last_login_at::text, 'Never') as last_login
        FROM users 
        ORDER BY created_at DESC;
    " | while IFS='|' read -r id username role status last_login; do
        # Clean up whitespace
        id=$(echo "$id" | xargs)
        username=$(echo "$username" | xargs)
        role=$(echo "$role" | xargs)
        status=$(echo "$status" | xargs)
        last_login=$(echo "$last_login" | xargs)
        
        # Truncate long values
        id=${id:0:36}
        username=${username:0:15}
        role=${role:0:17}
        status=${status:0:9}
        last_login=${last_login:0:18}
        
        printf "%-36s | %-15s | %-17s | %-9s | %s\n" "$id" "$username" "$role" "$status" "$last_login"
    done
    
    echo ""
}

# =============================================================================
# Create User
# =============================================================================

create_user() {
    local username=$1
    local email=$2
    local role=$3
    local password=$4
    
    log_header "Creating New User"
    
    if ! check_database_connection; then
        return 1
    fi
    
    # Validate inputs
    if [ -z "$username" ]; then
        log_error "Username is required"
        return 1
    fi
    
    if [ -z "$role" ]; then
        log_error "Role is required"
        return 1
    fi
    
    if [ -z "$password" ]; then
        log_error "Password is required"
        return 1
    fi
    
    # Validate role
    if [[ ! " ${AVAILABLE_ROLES[@]} " =~ " ${role} " ]]; then
        log_error "Invalid role: $role"
        log_info "Available roles: ${AVAILABLE_ROLES[*]}"
        return 1
    fi
    
    # Check if user already exists
    local existing_user=$(docker-compose -f "$PROJECT_ROOT/docker-compose.yml" exec -T postgres psql -U postgres -d seth_clinic -t -c "
        SELECT username FROM users WHERE username = '$username';
    " | xargs)
    
    if [ -n "$existing_user" ]; then
        log_error "User '$username' already exists"
        return 1
    fi
    
    # Hash password (using bcrypt)
    local password_hash=$(node -e "
        const bcrypt = require('bcrypt');
        console.log(bcrypt.hashSync('$password', 12));
    " 2>/dev/null)
    
    if [ -z "$password_hash" ]; then
        log_error "Failed to hash password"
        return 1
    fi
    
    # Create user
    local user_id=$(docker-compose -f "$PROJECT_ROOT/docker-compose.yml" exec -T postgres psql -U postgres -d seth_clinic -t -c "
        INSERT INTO users (username, email, password_hash, role, is_active, created_at, updated_at)
        VALUES ('$username', '$email', '$password_hash', '$role', true, NOW(), NOW())
        RETURNING id;
    " | xargs)
    
    if [ -n "$user_id" ]; then
        log_success "User '$username' created successfully with ID: $user_id"
        return 0
    else
        log_error "Failed to create user"
        return 1
    fi
}

# =============================================================================
# Update User
# =============================================================================

update_user() {
    local username=$1
    local field=$2
    local value=$3
    
    log_header "Updating User: $username"
    
    if ! check_database_connection; then
        return 1
    fi
    
    # Check if user exists
    local user_id=$(docker-compose -f "$PROJECT_ROOT/docker-compose.yml" exec -T postgres psql -U postgres -d seth_clinic -t -c "
        SELECT id FROM users WHERE username = '$username';
    " | xargs)
    
    if [ -z "$user_id" ]; then
        log_error "User '$username' not found"
        return 1
    fi
    
    # Validate field
    case $field in
        "email"|"role"|"is_active"|"password")
            ;;
        *)
            log_error "Invalid field: $field"
            log_info "Valid fields: email, role, is_active, password"
            return 1
            ;;
    esac
    
    # Handle special cases
    if [ "$field" = "password" ]; then
        # Hash new password
        local password_hash=$(node -e "
            const bcrypt = require('bcrypt');
            console.log(bcrypt.hashSync('$value', 12));
        " 2>/dev/null)
        
        if [ -z "$password_hash" ]; then
            log_error "Failed to hash password"
            return 1
        fi
        
        value="$password_hash"
        field="password_hash"
    fi
    
    if [ "$field" = "is_active" ]; then
        if [[ "$value" =~ ^(true|false)$ ]]; then
            value="$value"
        else
            log_error "is_active must be 'true' or 'false'"
            return 1
        fi
    fi
    
    # Update user
    local result=$(docker-compose -f "$PROJECT_ROOT/docker-compose.yml" exec -T postgres psql -U postgres -d seth_clinic -t -c "
        UPDATE users 
        SET $field = '$value', updated_at = NOW()
        WHERE username = '$username'
        RETURNING username;
    " | xargs)
    
    if [ -n "$result" ]; then
        log_success "User '$username' updated successfully"
        return 0
    else
        log_error "Failed to update user"
        return 1
    fi
}

# =============================================================================
# Delete User
# =============================================================================

delete_user() {
    local username=$1
    
    log_header "Deleting User: $username"
    
    if ! check_database_connection; then
        return 1
    fi
    
    # Check if user exists
    local user_id=$(docker-compose -f "$PROJECT_ROOT/docker-compose.yml" exec -T postgres psql -U postgres -d seth_clinic -t -c "
        SELECT id FROM users WHERE username = '$username';
    " | xargs)
    
    if [ -z "$user_id" ]; then
        log_error "User '$username' not found"
        return 1
    fi
    
    # Confirm deletion
    echo -n "Are you sure you want to delete user '$username'? (yes/no): "
    read -r confirmation
    
    if [ "$confirmation" != "yes" ]; then
        log_info "User deletion cancelled"
        return 0
    fi
    
    # Delete user
    local result=$(docker-compose -f "$PROJECT_ROOT/docker-compose.yml" exec -T postgres psql -U postgres -d seth_clinic -t -c "
        DELETE FROM users WHERE username = '$username' RETURNING username;
    " | xargs)
    
    if [ -n "$result" ]; then
        log_success "User '$username' deleted successfully"
        return 0
    else
        log_error "Failed to delete user"
        return 1
    fi
}

# =============================================================================
# Reset Password
# =============================================================================

reset_password() {
    local username=$1
    local new_password=$2
    
    log_header "Resetting Password for: $username"
    
    if ! check_database_connection; then
        return 1
    fi
    
    # Check if user exists
    local user_id=$(docker-compose -f "$PROJECT_ROOT/docker-compose.yml" exec -T postgres psql -U postgres -d seth_clinic -t -c "
        SELECT id FROM users WHERE username = '$username';
    " | xargs)
    
    if [ -z "$user_id" ]; then
        log_error "User '$username' not found"
        return 1
    fi
    
    # Generate new password if not provided
    if [ -z "$new_password" ]; then
        new_password=$(openssl rand -base64 12 | tr -d "=+/" | cut -c1-12)
        log_info "Generated new password: $new_password"
    fi
    
    # Hash new password
    local password_hash=$(node -e "
        const bcrypt = require('bcrypt');
        console.log(bcrypt.hashSync('$new_password', 12));
    " 2>/dev/null)
    
    if [ -z "$password_hash" ]; then
        log_error "Failed to hash password"
        return 1
    fi
    
    # Update password
    local result=$(docker-compose -f "$PROJECT_ROOT/docker-compose.yml" exec -T postgres psql -U postgres -d seth_clinic -t -c "
        UPDATE users 
        SET password_hash = '$password_hash', updated_at = NOW()
        WHERE username = '$username'
        RETURNING username;
    " | xargs)
    
    if [ -n "$result" ]; then
        log_success "Password reset successfully for user '$username'"
        log_info "New password: $new_password"
        return 0
    else
        log_error "Failed to reset password"
        return 1
    fi
}

# =============================================================================
# Unlock User
# =============================================================================

unlock_user() {
    local username=$1
    
    log_header "Unlocking User: $username"
    
    if ! check_database_connection; then
        return 1
    fi
    
    # Check if user exists
    local user_id=$(docker-compose -f "$PROJECT_ROOT/docker-compose.yml" exec -T postgres psql -U postgres -d seth_clinic -t -c "
        SELECT id FROM users WHERE username = '$username';
    " | xargs)
    
    if [ -z "$user_id" ]; then
        log_error "User '$username' not found"
        return 1
    fi
    
    # Unlock user
    local result=$(docker-compose -f "$PROJECT_ROOT/docker-compose.yml" exec -T postgres psql -U postgres -d seth_clinic -t -c "
        UPDATE users 
        SET is_locked = false, failed_login_attempts = 0, updated_at = NOW()
        WHERE username = '$username'
        RETURNING username;
    " | xargs)
    
    if [ -n "$result" ]; then
        log_success "User '$username' unlocked successfully"
        return 0
    else
        log_error "Failed to unlock user"
        return 1
    fi
}

# =============================================================================
# Interactive User Creation
# =============================================================================

interactive_create_user() {
    log_header "Interactive User Creation"
    
    echo ""
    echo "Please provide the following information:"
    echo ""
    
    # Get username
    echo -n "Username: "
    read -r username
    
    # Get email
    echo -n "Email (optional): "
    read -r email
    
    # Get role
    echo ""
    echo "Available roles:"
    for i in "${!AVAILABLE_ROLES[@]}"; do
        echo "  $((i+1)). ${AVAILABLE_ROLES[$i]}"
    done
    echo ""
    echo -n "Select role (1-${#AVAILABLE_ROLES[@]}): "
    read -r role_choice
    
    if [[ ! "$role_choice" =~ ^[0-9]+$ ]] || [ "$role_choice" -lt 1 ] || [ "$role_choice" -gt "${#AVAILABLE_ROLES[@]}" ]; then
        log_error "Invalid role selection"
        return 1
    fi
    
    local role="${AVAILABLE_ROLES[$((role_choice-1))]}"
    
    # Get password
    echo -n "Password: "
    read -rs password
    echo ""
    
    echo -n "Confirm password: "
    read -rs password_confirm
    echo ""
    
    if [ "$password" != "$password_confirm" ]; then
        log_error "Passwords do not match"
        return 1
    fi
    
    # Create user
    create_user "$username" "$email" "$role" "$password"
}

# =============================================================================
# User Statistics
# =============================================================================

show_user_statistics() {
    log_header "User Statistics"
    
    if ! check_database_connection; then
        return 1
    fi
    
    echo ""
    echo "User Statistics:"
    echo "================="
    
    # Total users
    local total_users=$(docker-compose -f "$PROJECT_ROOT/docker-compose.yml" exec -T postgres psql -U postgres -d seth_clinic -t -c "
        SELECT COUNT(*) FROM users;
    " | xargs)
    
    echo "Total Users: $total_users"
    
    # Active users
    local active_users=$(docker-compose -f "$PROJECT_ROOT/docker-compose.yml" exec -T postgres psql -U postgres -d seth_clinic -t -c "
        SELECT COUNT(*) FROM users WHERE is_active = true;
    " | xargs)
    
    echo "Active Users: $active_users"
    
    # Locked users
    local locked_users=$(docker-compose -f "$PROJECT_ROOT/docker-compose.yml" exec -T postgres psql -U postgres -d seth_clinic -t -c "
        SELECT COUNT(*) FROM users WHERE is_locked = true;
    " | xargs)
    
    echo "Locked Users: $locked_users"
    
    # Users by role
    echo ""
    echo "Users by Role:"
    echo "--------------"
    
    for role in "${AVAILABLE_ROLES[@]}"; do
        local count=$(docker-compose -f "$PROJECT_ROOT/docker-compose.yml" exec -T postgres psql -U postgres -d seth_clinic -t -c "
            SELECT COUNT(*) FROM users WHERE role = '$role';
        " | xargs)
        
        printf "%-20s: %s\n" "$role" "$count"
    done
    
    echo ""
}

# =============================================================================
# Main Function
# =============================================================================

main() {
    # Create log directory if it doesn't exist
    mkdir -p "$(dirname "$LOG_FILE")"
    
    log_header "Seth Medical Clinic CMS - User Management"
}

# =============================================================================
# Command Line Interface
# =============================================================================

show_help() {
    echo "Seth Medical Clinic CMS - User Management System"
    echo ""
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  list                    List all users"
    echo "  create [USER] [EMAIL] [ROLE] [PASSWORD]  Create new user"
    echo "  update [USER] [FIELD] [VALUE]            Update user"
    echo "  delete [USER]           Delete user"
    echo "  reset-password [USER] [PASSWORD]         Reset user password"
    echo "  unlock [USER]           Unlock locked user"
    echo "  interactive             Interactive user creation"
    echo "  stats                   Show user statistics"
    echo ""
    echo "Available Roles:"
    for role in "${AVAILABLE_ROLES[@]}"; do
        echo "  - $role"
    done
    echo ""
    echo "Update Fields:"
    echo "  - email                 User email address"
    echo "  - role                  User role"
    echo "  - is_active             true/false"
    echo "  - password              New password"
    echo ""
    echo "Examples:"
    echo "  $0 list"
    echo "  $0 create john john@clinic.com CLINICAL_OFFICER password123"
    echo "  $0 update john role PHARMACIST"
    echo "  $0 reset-password john newpassword123"
    echo "  $0 unlock john"
    echo "  $0 interactive"
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
        list)
            COMMAND="list"
            shift
            ;;
        create)
            COMMAND="create"
            USERNAME="$2"
            EMAIL="$3"
            ROLE="$4"
            PASSWORD="$5"
            shift 5
            ;;
        update)
            COMMAND="update"
            USERNAME="$2"
            FIELD="$3"
            VALUE="$4"
            shift 4
            ;;
        delete)
            COMMAND="delete"
            USERNAME="$2"
            shift 2
            ;;
        reset-password)
            COMMAND="reset-password"
            USERNAME="$2"
            PASSWORD="$3"
            shift 3
            ;;
        unlock)
            COMMAND="unlock"
            USERNAME="$2"
            shift 2
            ;;
        interactive)
            COMMAND="interactive"
            shift
            ;;
        stats)
            COMMAND="stats"
            shift
            ;;
        *)
            log_error "Unknown command: $1"
            show_help
            exit 1
            ;;
    esac
done

# Execute command
case $COMMAND in
    list)
        main
        list_users
        ;;
    create)
        main
        create_user "$USERNAME" "$EMAIL" "$ROLE" "$PASSWORD"
        ;;
    update)
        main
        update_user "$USERNAME" "$FIELD" "$VALUE"
        ;;
    delete)
        main
        delete_user "$USERNAME"
        ;;
    reset-password)
        main
        reset_password "$USERNAME" "$PASSWORD"
        ;;
    unlock)
        main
        unlock_user "$USERNAME"
        ;;
    interactive)
        main
        interactive_create_user
        ;;
    stats)
        main
        show_user_statistics
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
