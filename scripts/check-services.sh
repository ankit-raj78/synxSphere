#!/bin/bash

# Service Management Script for SynxSphere
# This script helps check and manage both React app and openDAW server

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
    echo -e "${BLUE}=== SynxSphere Service Manager (Clean Architecture) ===${NC}"
    echo ""
}

check_service() {
    local service_name=$1
    local url=$2
    local curl_opts=${3:-""}
    
    echo -e "${YELLOW}Checking $service_name...${NC}"
    
    if curl -s -I $curl_opts "$url" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ $service_name is running and accessible${NC}"
        return 0
    else
        echo -e "${RED}✗ $service_name is not running or not accessible${NC}"
        return 1
    fi
}

check_process() {
    local process_name=$1
    local port=$2
    
    if lsof -i :$port > /dev/null 2>&1; then
        local pid=$(lsof -t -i :$port)
        echo -e "${GREEN}✓ Process running on port $port (PID: $pid)${NC}"
        return 0
    else
        echo -e "${RED}✗ No process found on port $port${NC}"
        return 1
    fi
}

start_react_app() {
    echo -e "${YELLOW}Starting Next.js application (Clean Architecture)...${NC}"
    npm run dev > /dev/null 2>&1 &
    echo -e "${GREEN}✓ Next.js app started in background${NC}"
    echo "  URL: http://localhost:3000"
}

start_opendaw_server() {
    echo -e "${YELLOW}Starting openDAW server...${NC}"
    npm run opendaw:start > /dev/null 2>&1 &
    echo -e "${GREEN}✓ openDAW server started in background${NC}"
    echo "  URL: https://localhost:8080"
}

stop_services() {
    echo -e "${YELLOW}Stopping all services...${NC}"
    
    # Stop React app
    if lsof -t -i :3000 > /dev/null 2>&1; then
        pkill -f "next dev" || true
        echo -e "${GREEN}✓ React app stopped${NC}"
    fi
    
    # Stop openDAW server
    if lsof -t -i :8080 > /dev/null 2>&1; then
        pkill -f "openDAW" || true
        echo -e "${GREEN}✓ openDAW server stopped${NC}"
    fi
}

show_status() {
    print_header
    echo -e "${BLUE}Service Status:${NC}"
    echo ""
    
    # Check Next.js app
    check_service "Next.js Application (Clean Architecture)" "http://localhost:3000"
    check_process "Next.js App" "3000"
    echo ""
    
    # Check openDAW server
    check_service "openDAW Server" "https://localhost:8080" "-k"
    check_process "openDAW Server" "8080"
    echo ""
    
    echo -e "${BLUE}Application URLs:${NC}"
    echo "  Main App: http://localhost:3000"
    echo "  Dashboard: http://localhost:3000/dashboard"
    echo "  Studio: http://localhost:3000/studio"
    echo "  Direct openDAW: https://localhost:8080"
    echo ""
}

show_help() {
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  status      Show status of all services (default)"
    echo "  start       Start all services"
    echo "  stop        Stop all services"
    echo "  restart     Restart all services"
    echo "  react       Start only React app"
    echo "  opendaw     Start only openDAW server"
    echo "  help        Show this help message"
    echo ""
}

case "${1:-status}" in
    "status")
        show_status
        ;;
    "start")
        print_header
        start_react_app
        sleep 2
        start_opendaw_server
        sleep 3
        echo ""
        show_status
        ;;
    "stop")
        print_header
        stop_services
        echo ""
        ;;
    "restart")
        print_header
        stop_services
        sleep 2
        start_react_app
        sleep 2
        start_opendaw_server
        sleep 3
        echo ""
        show_status
        ;;
    "react")
        print_header
        start_react_app
        sleep 2
        echo ""
        check_service "Next.js Application (Clean Architecture)" "http://localhost:3000"
        ;;
    "opendaw")
        print_header
        start_opendaw_server
        sleep 3
        echo ""
        check_service "openDAW Server" "https://localhost:8080" "-k"
        ;;
    "help")
        show_help
        ;;
    *)
        echo "Unknown command: $1"
        show_help
        exit 1
        ;;
esac
