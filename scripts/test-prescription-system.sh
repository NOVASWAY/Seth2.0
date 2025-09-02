#!/bin/bash

# Test Prescription System with Authentication
# This script tests the prescription system endpoints with proper authentication

set -e

echo "🔍 Testing Prescription System with Authentication..."
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    local status=$1
    local message=$2
    if [ "$status" = "success" ]; then
        echo -e "${GREEN}✅ $message${NC}"
    elif [ "$status" = "warning" ]; then
        echo -e "${YELLOW}⚠️  $message${NC}"
    else
        echo -e "${RED}❌ $message${NC}"
    fi
}

# Check if backend is running
echo "🔍 Checking backend status..."
if ! curl -f -s "http://localhost:5000/health" > /dev/null; then
    print_status "error" "Backend is not running. Please start the backend first."
    exit 1
fi
print_status "success" "Backend is running"

# Try to authenticate with different users
echo ""
echo "🔐 Testing authentication..."

# Test with admin user
echo "Testing admin login..."
ADMIN_RESPONSE=$(curl -s -X POST http://localhost:5000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"admin123"}')

if echo "$ADMIN_RESPONSE" | grep -q '"success":true'; then
    print_status "success" "Admin authentication successful"
    ADMIN_TOKEN=$(echo "$ADMIN_RESPONSE" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
    echo "Admin token obtained"
else
    print_status "warning" "Admin authentication failed: $(echo "$ADMIN_RESPONSE" | grep -o '"message":"[^"]*"' | cut -d'"' -f4)"
fi

# Test with clinical officer
echo "Testing clinical officer login..."
CLINICAL_RESPONSE=$(curl -s -X POST http://localhost:5000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"clinicalofficer1","password":"admin123"}')

if echo "$CLINICAL_RESPONSE" | grep -q '"success":true'; then
    print_status "success" "Clinical officer authentication successful"
    CLINICAL_TOKEN=$(echo "$CLINICAL_RESPONSE" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
    echo "Clinical officer token obtained"
else
    print_status "warning" "Clinical officer authentication failed: $(echo "$CLINICAL_RESPONSE" | grep -o '"message":"[^"]*"' | cut -d'"' -f4)"
fi

# Test with pharmacist
echo "Testing pharmacist login..."
PHARMACIST_RESPONSE=$(curl -s -X POST http://localhost:5000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"pharmacist1","password":"admin123"}')

if echo "$PHARMACIST_RESPONSE" | grep -q '"success":true'; then
    print_status "success" "Pharmacist authentication successful"
    PHARMACIST_TOKEN=$(echo "$PHARMACIST_RESPONSE" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
    echo "Pharmacist token obtained"
else
    print_status "warning" "Pharmacist authentication failed: $(echo "$PHARMACIST_RESPONSE" | grep -o '"message":"[^"]*"' | cut -d'"' -f4)"
fi

# Use the first available token
if [ -n "$ADMIN_TOKEN" ]; then
    TOKEN=$ADMIN_TOKEN
    USER_TYPE="admin"
elif [ -n "$CLINICAL_TOKEN" ]; then
    TOKEN=$CLINICAL_TOKEN
    USER_TYPE="clinical officer"
elif [ -n "$PHARMACIST_TOKEN" ]; then
    TOKEN=$PHARMACIST_TOKEN
    USER_TYPE="pharmacist"
else
    print_status "error" "No valid authentication tokens obtained. Cannot test protected endpoints."
    exit 1
fi

echo ""
echo "🔑 Using $USER_TYPE token for testing protected endpoints..."
echo "=================================================="

# Test prescription endpoints
echo ""
echo "💊 Testing Prescription Endpoints..."

# Test inventory available stock
echo "Testing inventory available stock..."
INVENTORY_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" \
    "http://localhost:5000/api/inventory/available-stock")

if echo "$INVENTORY_RESPONSE" | grep -q '"success":true'; then
    print_status "success" "Inventory available stock endpoint working"
else
    print_status "error" "Inventory available stock endpoint failed: $(echo "$INVENTORY_RESPONSE" | grep -o '"message":"[^"]*"' | cut -d'"' -f4)"
fi

# Test prescriptions endpoint
echo "Testing prescriptions endpoint..."
PRESCRIPTION_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" \
    "http://localhost:5000/api/prescriptions")

if echo "$PRESCRIPTION_RESPONSE" | grep -q '"success":true'; then
    print_status "success" "Prescriptions endpoint working"
else
    print_status "error" "Prescriptions endpoint failed: $(echo "$PRESCRIPTION_RESPONSE" | grep -o '"message":"[^"]*"' | cut -d'"' -f4)"
fi

# Test lab tests endpoint
echo "Testing lab tests endpoint..."
LAB_TESTS_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" \
    "http://localhost:5000/api/lab-tests/available")

if echo "$LAB_TESTS_RESPONSE" | grep -q '"success":true'; then
    print_status "success" "Lab tests endpoint working"
else
    print_status "error" "Lab tests endpoint failed: $(echo "$LAB_TESTS_RESPONSE" | grep -o '"message":"[^"]*"' | cut -d'"' -f4)"
fi

echo ""
echo "🎉 Prescription System Test Complete!"
echo "=================================================="
echo "User authenticated as: $USER_TYPE"
echo "All protected endpoints tested with proper authentication"
echo ""
echo "If you see any ❌ errors above, those endpoints may need additional setup"
echo "If you see ✅ success messages, the prescription system is working correctly"
