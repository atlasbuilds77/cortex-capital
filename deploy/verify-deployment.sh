#!/bin/bash
# Deployment Verification Script
# Tests production deployment health

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BACKEND_URL="${BACKEND_URL:-https://api.cortexcapital.ai}"
FRONTEND_URL="${FRONTEND_URL:-https://app.cortexcapital.ai}"

echo "================================================"
echo "Cortex Capital Deployment Verification"
echo "================================================"
echo ""

# Function to check URL
check_url() {
    local url=$1
    local name=$2
    
    echo -n "Checking ${name}... "
    
    if curl -s -f -o /dev/null -w "%{http_code}" "$url" | grep -q "200\|301\|302"; then
        echo -e "${GREEN}✓ OK${NC}"
        return 0
    else
        echo -e "${RED}✗ FAILED${NC}"
        return 1
    fi
}

# Function to check SSL
check_ssl() {
    local domain=$1
    local name=$2
    
    echo -n "Checking SSL for ${name}... "
    
    if echo | openssl s_client -connect "$domain:443" -servername "$domain" 2>/dev/null | grep -q "Verify return code: 0"; then
        echo -e "${GREEN}✓ Valid${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠ Warning${NC}"
        return 1
    fi
}

# Function to check DNS
check_dns() {
    local domain=$1
    local name=$2
    
    echo -n "Checking DNS for ${name}... "
    
    if dig +short "$domain" | grep -q "."; then
        echo -e "${GREEN}✓ Resolves${NC}"
        return 0
    else
        echo -e "${RED}✗ No records${NC}"
        return 1
    fi
}

echo "=== Backend Health ==="
check_url "${BACKEND_URL}/health" "Backend Health Endpoint"

echo ""
echo "=== Frontend Health ==="
check_url "${FRONTEND_URL}" "Frontend Homepage"

echo ""
echo "=== DNS Resolution ==="
check_dns "api.cortexcapital.ai" "Backend DNS"
check_dns "app.cortexcapital.ai" "Frontend DNS"

echo ""
echo "=== SSL Certificates ==="
check_ssl "api.cortexcapital.ai" "Backend SSL"
check_ssl "app.cortexcapital.ai" "Frontend SSL"

echo ""
echo "=== API Endpoints ==="
check_url "${BACKEND_URL}/api/tradier/profile" "Tradier Profile"
check_url "${BACKEND_URL}/api/tradier/accounts" "Tradier Accounts"

echo ""
echo "=== Security Headers ==="
echo -n "Checking security headers... "
headers=$(curl -s -I "${FRONTEND_URL}" | grep -i "x-frame-options\|x-content-type-options\|strict-transport-security" | wc -l)
if [ "$headers" -ge 2 ]; then
    echo -e "${GREEN}✓ Present${NC}"
else
    echo -e "${YELLOW}⚠ Missing some headers${NC}"
fi

echo ""
echo "=== CORS Check ==="
echo -n "Checking CORS configuration... "
cors=$(curl -s -H "Origin: ${FRONTEND_URL}" -I "${BACKEND_URL}/health" | grep -i "access-control-allow-origin" | wc -l)
if [ "$cors" -ge 1 ]; then
    echo -e "${GREEN}✓ Configured${NC}"
else
    echo -e "${YELLOW}⚠ May need configuration${NC}"
fi

echo ""
echo "================================================"
echo "Verification Complete"
echo "================================================"
echo ""
echo "For detailed logs:"
echo "  Backend: railway logs --follow"
echo "  Frontend: vercel logs --follow"
echo ""
echo "For manual testing:"
echo "  Backend: curl ${BACKEND_URL}/health"
echo "  Frontend: open ${FRONTEND_URL}"
echo ""
