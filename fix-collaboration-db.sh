#!/bin/bash

# ============================================================================
# Fix OpenDAW Collaboration Database Schema
# ============================================================================
# This script fixes all the collaboration database issues by creating
# the necessary tables and functions
# ============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}============================================================================${NC}"
echo -e "${CYAN}🔧 Fixing OpenDAW Collaboration Database Schema${NC}"
echo -e "${CYAN}============================================================================${NC}"
echo ""

# Database configuration
DB_HOST="localhost"
DB_PORT="5433"
DB_NAME="opendaw_collab"
DB_USER="opendaw"
DB_PASSWORD="collaboration"

# Function to print step headers
print_step() {
    echo ""
    echo -e "${GREEN}==== $1 ====${NC}"
}

# Function to print substeps
print_substep() {
    echo -e "${YELLOW}→ $1${NC}"
}

# Function to check if PostgreSQL is running
check_postgres() {
    print_step "1. Checking PostgreSQL Connection"
    
    # Check if PostgreSQL is running on the expected port
    if ! nc -z localhost $DB_PORT; then
        echo -e "${RED}❌ PostgreSQL is not running on port $DB_PORT${NC}"
        echo -e "${YELLOW}💡 Please start the collaboration database:${NC}"
        echo -e "   cd opendaw-collab-mvp && docker-compose up -d postgres"
        exit 1
    fi
    
    echo -e "${GREEN}✅ PostgreSQL is running on port $DB_PORT${NC}"
}

# Function to check if database exists
check_database() {
    print_substep "Checking if database '$DB_NAME' exists"
    
    if PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -lqt | cut -d \| -f 1 | grep -qw $DB_NAME; then
        echo -e "${GREEN}✅ Database '$DB_NAME' exists${NC}"
    else
        echo -e "${YELLOW}⚠️  Database '$DB_NAME' does not exist, creating it...${NC}"
        PGPASSWORD=$DB_PASSWORD createdb -h $DB_HOST -p $DB_PORT -U $DB_USER $DB_NAME
        echo -e "${GREEN}✅ Database '$DB_NAME' created${NC}"
    fi
}

# Function to run the schema fix
run_schema_fix() {
    print_step "2. Applying Database Schema Fix"
    
    print_substep "Running collaboration schema creation script"
    
    # Run the SQL script
    if PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f fix-collaboration-database.sql; then
        echo -e "${GREEN}✅ Database schema fix applied successfully${NC}"
    else
        echo -e "${RED}❌ Failed to apply database schema fix${NC}"
        exit 1
    fi
}

# Function to verify the fix
verify_fix() {
    print_step "3. Verifying Database Setup"
    
    print_substep "Checking required tables exist"
    
    # Check if key tables exist
    TABLES=("projects" "studio_projects" "collaboration_events" "user_sessions" "box_ownership" "timeline_elements")
    
    for table in "${TABLES[@]}"; do
        if PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "\dt $table" | grep -q "$table"; then
            echo -e "${GREEN}✅ Table '$table' exists${NC}"
        else
            echo -e "${RED}❌ Table '$table' missing${NC}"
            exit 1
        fi
    done
    
    print_substep "Checking required functions exist"
    
    # Check if key functions exist
    FUNCTIONS=("cleanup_expired_locks" "get_project_by_room" "upsert_studio_project" "add_collaboration_event")
    
    for func in "${FUNCTIONS[@]}"; do
        if PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "\df $func" | grep -q "$func"; then
            echo -e "${GREEN}✅ Function '$func' exists${NC}"
        else
            echo -e "${RED}❌ Function '$func' missing${NC}"
            exit 1
        fi
    done
}

# Function to start collaboration services
start_services() {
    print_step "4. Starting Collaboration Services"
    
    print_substep "Checking if collaboration server is running"
    
    # Check if collaboration server is running on port 8443
    if nc -z localhost 8443; then
        echo -e "${GREEN}✅ Collaboration server is already running on port 8443${NC}"
    else
        echo -e "${YELLOW}⚠️  Collaboration server is not running${NC}"
        echo -e "${YELLOW}💡 Please start the collaboration server:${NC}"
        echo -e "   cd opendaw-collab-mvp && npm start"
        echo -e "   or"
        echo -e "   cd opendaw-collab-mvp && docker-compose up -d"
    fi
}

# Function to test API endpoints
test_endpoints() {
    print_step "5. Testing API Endpoints"
    
    print_substep "Testing collaboration server health"
    
    # Test if the collaboration server responds
    if curl -f -s "https://localhost:8443/health" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Collaboration server is responding${NC}"
    else
        echo -e "${YELLOW}⚠️  Collaboration server health check failed${NC}"
        echo -e "${YELLOW}💡 This is normal if the server isn't running yet${NC}"
    fi
}

# Main execution
main() {
    echo -e "${BLUE}This script will fix the following collaboration issues:${NC}"
    echo -e "  🗄️  Create missing database tables"
    echo -e "  🔧 Add required database functions"
    echo -e "  📊 Set up proper indexes for performance"
    echo -e "  ✅ Fix the 404 /api/rooms/{roomId}/studio-project error"
    echo -e "  🔄 Fix the 'Failed to sync state' error"
    echo -e "  🎵 Enable proper StudioService serialization"
    echo ""
    
    read -p "Continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Setup cancelled${NC}"
        exit 0
    fi
    
    check_postgres
    check_database
    run_schema_fix
    verify_fix
    start_services
    test_endpoints
    
    echo ""
    echo -e "${CYAN}============================================================================${NC}"
    echo -e "${GREEN}🎉 Collaboration Database Fix Complete!${NC}"
    echo -e "${CYAN}============================================================================${NC}"
    echo ""
    echo -e "${GREEN}✅ All database tables and functions created successfully${NC}"
    echo -e "${GREEN}✅ The collaboration system should now work properly${NC}"
    echo ""
    echo -e "${BLUE}Next steps:${NC}"
    echo -e "  1. Make sure the collaboration server is running:"
    echo -e "     ${CYAN}cd opendaw-collab-mvp && npm start${NC}"
    echo -e "  2. Start your main application"
    echo -e "  3. Test the collaboration features"
    echo ""
    echo -e "${YELLOW}Note: If you still see StudioService warnings, make sure:${NC}"
    echo -e "  • The collaboration initialization happens after StudioService is ready"
    echo -e "  • The studioService reference is properly passed to the CollaborationManager"
    echo ""
}

# Check if nc (netcat) is available
if ! command -v nc >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  netcat (nc) not found. Installing via Homebrew...${NC}"
    if command -v brew >/dev/null 2>&1; then
        brew install netcat
    else
        echo -e "${YELLOW}⚠️  Please install netcat manually for connection testing${NC}"
    fi
fi

# Check if psql is available
if ! command -v psql >/dev/null 2>&1; then
    echo -e "${RED}❌ PostgreSQL client (psql) is required but not installed${NC}"
    echo -e "${YELLOW}💡 Install with: brew install postgresql${NC}"
    exit 1
fi

# Run main function
main
