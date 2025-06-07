#!/bin/bash

# Comprehensive test suite for SyncSphere TypeScript services
echo "🧪 SyncSphere TypeScript Services Test Suite"
echo "=============================================="

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0

# Function to run test and check result
run_test() {
    local test_name="$1"
    local test_command="$2"
    local test_dir="$3"
    
    echo -e "${BLUE}🔄 Testing: $test_name${NC}"
    
    if [ -n "$test_dir" ]; then
        cd "$test_dir" || exit 1
    fi
    
    if eval "$test_command" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ PASS: $test_name${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}❌ FAIL: $test_name${NC}"
        ((TESTS_FAILED++))
        # Show error details
        eval "$test_command"
    fi
    
    if [ -n "$test_dir" ]; then
        cd - > /dev/null || exit 1
    fi
}

echo "Starting comprehensive tests..."
echo ""

# Test 1: Check if all package.json files exist
echo -e "${YELLOW}📦 Package Configuration Tests${NC}"
run_test "User Service package.json exists" "test -f services/user-service/package.json"
run_test "Audio Service package.json exists" "test -f services/audio-service/package.json"
run_test "Session Service package.json exists" "test -f services/session-service/package.json"
run_test "Shared package.json exists" "test -f services/shared/package.json"

# Test 2: TypeScript compilation tests
echo ""
echo -e "${YELLOW}🔨 TypeScript Compilation Tests${NC}"
run_test "Shared types compilation" "npm run build" "services/shared"
run_test "User Service compilation" "npm run build" "services/user-service"
run_test "Audio Service compilation" "npm run build" "services/audio-service"
run_test "Session Service compilation" "npm run build" "services/session-service"

# Test 3: Check for essential TypeScript files
echo ""
echo -e "${YELLOW}📄 Essential Files Tests${NC}"
run_test "Shared types index.ts exists" "test -f services/shared/types/index.ts"
run_test "Database manager exists" "test -f services/shared/config/database.ts"
run_test "Auth middleware exists" "test -f services/shared/middleware/auth.ts"

# Test 4: Service-specific file checks
echo ""
echo -e "${YELLOW}🎯 Service-Specific Tests${NC}"

# User Service
run_test "User Service main index.ts" "test -f services/user-service/src/index.ts"
run_test "AuthController exists" "test -f services/user-service/src/controllers/AuthController.ts"
run_test "ProfileController exists" "test -f services/user-service/src/controllers/ProfileController.ts"

# Audio Service
run_test "Audio Service main index.ts" "test -f services/audio-service/src/index.ts"
run_test "AudioProcessor service exists" "test -f services/audio-service/src/services/AudioProcessor.ts"
run_test "UploadController exists" "test -f services/audio-service/src/controllers/UploadController.ts"
run_test "Audio upload directory exists" "test -d services/audio-service/uploads/audio"

# Session Service
run_test "Session Service main index.ts" "test -f services/session-service/src/index.ts"
run_test "RoomController exists" "test -f services/session-service/src/controllers/RoomController.ts"
run_test "WebSocketManager exists" "test -f services/session-service/src/services/WebSocketManager.ts"

# Test 5: TypeScript configuration tests
echo ""
echo -e "${YELLOW}⚙️  TypeScript Configuration Tests${NC}"
run_test "User Service tsconfig.json valid" "npx tsc --noEmit" "services/user-service"
run_test "Audio Service tsconfig.json valid" "npx tsc --noEmit" "services/audio-service"
run_test "Session Service tsconfig.json valid" "npx tsc --noEmit" "services/session-service"

# Test 6: Dependencies check
echo ""
echo -e "${YELLOW}📚 Dependencies Tests${NC}"
run_test "User Service dependencies installed" "test -d services/user-service/node_modules"
run_test "Audio Service dependencies installed" "test -d services/audio-service/node_modules"
run_test "Session Service dependencies installed" "test -d services/session-service/node_modules"

# Test 7: Build output check
echo ""
echo -e "${YELLOW}🏗️  Build Output Tests${NC}"
run_test "User Service dist directory" "test -d services/user-service/dist"
run_test "Audio Service dist directory" "test -d services/audio-service/dist"
run_test "Session Service dist directory" "test -d services/session-service/dist"
run_test "Shared dist directory" "test -d services/shared/dist"

# Test 8: Critical route files
echo ""
echo -e "${YELLOW}🛣️  Route Files Tests${NC}"
run_test "User auth routes" "test -f services/user-service/src/routes/authRoutes.ts"
run_test "Audio upload routes" "test -f services/audio-service/src/routes/uploadRoutes.ts"
run_test "Session room routes" "test -f services/session-service/src/routes/roomRoutes.ts"

# Test 9: Unit tests (if available)
echo ""
echo -e "${YELLOW}🧪 Unit Tests${NC}"
if [ -f "services/user-service/src/tests/auth.test.ts" ]; then
    run_test "User Service unit tests" "npm test" "services/user-service"
else
    echo -e "${YELLOW}ℹ️  User Service unit tests not found (optional)${NC}"
fi

# Final Results
echo ""
echo "=============================================="
echo -e "${BLUE}📊 Test Results Summary${NC}"
echo "=============================================="
echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"
echo -e "Total Tests: $((TESTS_PASSED + TESTS_FAILED))"

if [ $TESTS_FAILED -eq 0 ]; then
    echo ""
    echo -e "${GREEN}🎉 All tests passed! TypeScript conversion is complete and functional.${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Start databases: docker-compose -f docker-compose.dev.yml up -d"
    echo "2. Start services: ./start-dev.sh"
    echo "3. Test API endpoints with your frontend or Postman"
    exit 0
else
    echo ""
    echo -e "${RED}❌ Some tests failed. Please review the errors above.${NC}"
    exit 1
fi
