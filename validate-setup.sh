#!/bin/bash

# ============================================================================
# OpenDAW Collaboration - Post-Setup Validation Script
# ============================================================================
# 
# This script validates that the setup was successful and all components
# are working correctly.
#
# Run this after the main setup script completes.
# ============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}============================================================================${NC}"
echo -e "${CYAN}🔍 OpenDAW Collaboration - Setup Validation${NC}"
echo -e "${CYAN}============================================================================${NC}"

# Function to check if port is in use
check_port() {
    local port=$1
    local service=$2
    
    if lsof -i :$port >/dev/null 2>&1; then
        echo -e "   ${GREEN}✅ Port $port ($service) is active${NC}"
        return 0
    else
        echo -e "   ${RED}❌ Port $port ($service) is not active${NC}"
        return 1
    fi
}

# Function to test HTTP endpoint
test_endpoint() {
    local url=$1
    local name=$2
    
    if curl -s -f "$url" >/dev/null 2>&1; then
        echo -e "   ${GREEN}✅ $name is responding${NC}"
        return 0
    else
        echo -e "   ${RED}❌ $name is not responding${NC}"
        return 1
    fi
}

# Start validation
echo ""
echo -e "${BLUE}Starting validation in 5 seconds...${NC}"
echo -e "${YELLOW}Make sure you have started all services with: npm start${NC}"
sleep 5

validation_errors=0

# 1. Check if all required files exist
echo ""
echo -e "${GREEN}==== 1. File Structure Validation ====${NC}"

required_files=(
    "package.json"
    "opendaw-collab-mvp/package.json"
    "openDAW/studio/package.json"
    "database/init.sql"
    "start-all.sh"
    "stop-all.sh"
    "test-final-integration.js"
)

for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        echo -e "   ${GREEN}✅ $file exists${NC}"
    else
        echo -e "   ${RED}❌ $file missing${NC}"
        ((validation_errors++))
    fi
done

# 2. Check database connectivity
echo ""
echo -e "${GREEN}==== 2. Database Validation ====${NC}"

DB_USER="opendaw"
DB_NAME="opendaw_collab"

if PGPASSWORD="collaboration" psql -h localhost -U $DB_USER -d $DB_NAME -c "SELECT 1;" >/dev/null 2>&1; then
    echo -e "   ${GREEN}✅ Database connection successful${NC}"
    
    # Check tables exist
    tables=("projects" "box_ownership" "box_locks" "user_sessions")
    for table in "${tables[@]}"; do
        if PGPASSWORD="collaboration" psql -h localhost -U $DB_USER -d $DB_NAME -c "SELECT 1 FROM $table LIMIT 1;" >/dev/null 2>&1; then
            echo -e "   ${GREEN}✅ Table '$table' exists and accessible${NC}"
        else
            echo -e "   ${RED}❌ Table '$table' missing or inaccessible${NC}"
            ((validation_errors++))
        fi
    done
else
    echo -e "   ${RED}❌ Database connection failed${NC}"
    echo -e "   ${YELLOW}   Make sure PostgreSQL is running and database is created${NC}"
    ((validation_errors++))
fi

# 3. Check if services are running
echo ""
echo -e "${GREEN}==== 3. Service Status Validation ====${NC}"

services_ok=0

if check_port 3003 "Collaboration Server"; then ((services_ok++)); fi
if check_port 3000 "SynxSphere Dashboard"; then ((services_ok++)); fi  
if check_port 8080 "OpenDAW Studio"; then ((services_ok++)); fi
if check_port 3005 "WebSocket Server"; then ((services_ok++)); fi

if [ $services_ok -eq 4 ]; then
    echo -e "   ${GREEN}✅ All services are running${NC}"
else
    echo -e "   ${RED}❌ Some services are not running ($services_ok/4)${NC}"
    echo -e "   ${YELLOW}   Run 'npm start' to start all services${NC}"
    ((validation_errors++))
fi

# 4. Test API endpoints
echo ""
echo -e "${GREEN}==== 4. API Endpoint Validation ====${NC}"

if curl -s http://localhost:3003/api/health | grep -q "ok"; then
    echo -e "   ${GREEN}✅ Collaboration API health check passed${NC}"
else
    echo -e "   ${RED}❌ Collaboration API health check failed${NC}"
    ((validation_errors++))
fi

# Test a simple project save/load
echo -e "   ${YELLOW}→ Testing project persistence...${NC}"
test_project_id="validation-test-$(date +%s)"

# Save test project
save_response=$(curl -s -X PUT "http://localhost:3003/api/projects/$test_project_id" \
    -H "Content-Type: application/json" \
    -d '{
        "name": "Validation Test Project",
        "data": "dGVzdA==",
        "metadata": {"validation": true}
    }')

if echo "$save_response" | grep -q "success"; then
    echo -e "   ${GREEN}✅ Project save test passed${NC}"
    
    # Load test project
    if curl -s "http://localhost:3003/api/projects/$test_project_id" | grep -q "Validation Test Project"; then
        echo -e "   ${GREEN}✅ Project load test passed${NC}"
        
        # Clean up test project
        curl -s -X DELETE "http://localhost:3003/api/projects/$test_project_id" >/dev/null
    else
        echo -e "   ${RED}❌ Project load test failed${NC}"
        ((validation_errors++))
    fi
else
    echo -e "   ${RED}❌ Project save test failed${NC}"
    ((validation_errors++))
fi

# 5. Test WebSocket connectivity
echo ""
echo -e "${GREEN}==== 5. WebSocket Validation ====${NC}"

# Create a simple WebSocket test
cat > /tmp/ws_test.js << 'EOF'
const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:3005');
let connected = false;

ws.on('open', function open() {
    connected = true;
    console.log('✅ WebSocket connection successful');
    
    // Send test message
    ws.send(JSON.stringify({
        type: 'USER_JOIN',
        projectId: 'validation-test',
        userId: 'validation-user'
    }));
    
    setTimeout(() => {
        ws.close();
        process.exit(0);
    }, 1000);
});

ws.on('message', function message(data) {
    console.log('✅ WebSocket message received');
});

ws.on('error', function error(err) {
    console.log('❌ WebSocket connection failed:', err.message);
    process.exit(1);
});

setTimeout(() => {
    if (!connected) {
        console.log('❌ WebSocket connection timeout');
        process.exit(1);
    }
}, 5000);
EOF

if node /tmp/ws_test.js 2>/dev/null; then
    echo -e "   ${GREEN}✅ WebSocket connectivity test passed${NC}"
else
    echo -e "   ${RED}❌ WebSocket connectivity test failed${NC}"
    ((validation_errors++))
fi

# Clean up
rm -f /tmp/ws_test.js

# 6. Generate test URLs and instructions
echo ""
echo -e "${GREEN}==== 6. Test URL Generation ====${NC}"

test_project="validation-$(date +%s)"
user1="user-$(openssl rand -hex 4)"
user2="user-$(openssl rand -hex 4)"

echo -e "${CYAN}🧪 Generated Test URLs:${NC}"
echo ""
echo -e "   ${YELLOW}User 1:${NC}"
echo -e "   https://localhost:8080/?collaborative=true&projectId=$test_project&userId=$user1&userName=ValidationUser1"
echo ""
echo -e "   ${YELLOW}User 2:${NC}"
echo -e "   https://localhost:8080/?collaborative=true&projectId=$test_project&userId=$user2&userName=ValidationUser2"
echo ""
echo -e "   ${YELLOW}Dashboard:${NC}"
echo -e "   http://localhost:3000/dashboard"

# 7. Final validation summary
echo ""
echo -e "${GREEN}==== Validation Summary ====${NC}"

if [ $validation_errors -eq 0 ]; then
    echo ""
    echo -e "${GREEN}🎉 VALIDATION PASSED! All systems operational.${NC}"
    echo ""
    echo -e "${CYAN}✅ What's Working:${NC}"
    echo -e "   • Database connectivity and schema"
    echo -e "   • All services running on correct ports"
    echo -e "   • REST API endpoints responding"
    echo -e "   • WebSocket real-time connectivity" 
    echo -e "   • Project save/load functionality"
    echo ""
    echo -e "${CYAN}🚀 Ready for Collaboration Testing:${NC}"
    echo -e "   1. Open the test URLs above in different browser tabs"
    echo -e "   2. Verify collaboration UI appears in OpenDAW"
    echo -e "   3. Create audio tracks and test real-time sync"
    echo -e "   4. Test auto-save and project persistence"
    echo ""
    echo -e "${CYAN}📋 Available Commands:${NC}"
    echo -e "   • ${YELLOW}npm start${NC}           - Start all services"
    echo -e "   • ${YELLOW}npm stop${NC}            - Stop all services"
    echo -e "   • ${YELLOW}npm run test:collab${NC} - Run collaboration tests"
    echo -e "   • ${YELLOW}npm run db:reset${NC}    - Reset database"
    echo ""
    echo -e "${GREEN}🎵 Happy Collaborating! 🎵${NC}"
    
    exit 0
else
    echo ""
    echo -e "${RED}❌ VALIDATION FAILED! ($validation_errors errors found)${NC}"
    echo ""
    echo -e "${CYAN}🔧 Troubleshooting Steps:${NC}"
    echo -e "   1. Make sure all services are running: ${YELLOW}npm start${NC}"
    echo -e "   2. Check PostgreSQL is installed and running"
    echo -e "   3. Verify no port conflicts (3000, 3003, 3005, 8080)"
    echo -e "   4. Check the setup log for any error messages"
    echo -e "   5. Try running the setup script again"
    echo ""
    echo -e "${CYAN}📞 Get Help:${NC}"
    echo -e "   • Check SETUP.md for detailed troubleshooting"
    echo -e "   • Verify all prerequisites are installed"
    echo -e "   • Check server logs for error messages"
    echo ""
    
    exit 1
fi
