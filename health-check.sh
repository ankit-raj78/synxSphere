#!/bin/bash

# Service health check for SyncSphere TypeScript microservices
echo "🏥 SyncSphere Service Health Check"
echo "=================================="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Health check function
check_service() {
    local service_name="$1"
    local port="$2"
    local endpoint="$3"
    
    echo -e "${BLUE}🔍 Checking $service_name (port $port)...${NC}"
    
    # Check if port is listening
    if lsof -i :$port > /dev/null 2>&1; then
        echo -e "${GREEN}✅ $service_name is running on port $port${NC}"
        
        # Try to hit health endpoint if provided
        if [ -n "$endpoint" ]; then
            if curl -s -f "http://localhost:$port$endpoint" > /dev/null; then
                echo -e "${GREEN}✅ $service_name health endpoint responding${NC}"
            else
                echo -e "${YELLOW}⚠️  $service_name running but health endpoint not responding${NC}"
            fi
        fi
    else
        echo -e "${RED}❌ $service_name not running on port $port${NC}"
    fi
    echo ""
}

# Check if services are running
echo "Checking service ports..."
echo ""

check_service "User Service" "3001" "/api/health"
check_service "Audio Service" "3002" "/api/health"  
check_service "Session Service" "3003" "/api/health"

# Check databases
echo -e "${BLUE}🗄️  Checking Database Connections...${NC}"

# PostgreSQL
if nc -z localhost 5432 2>/dev/null; then
    echo -e "${GREEN}✅ PostgreSQL is running (port 5432)${NC}"
else
    echo -e "${YELLOW}⚠️  PostgreSQL not detected (port 5432)${NC}"
fi

# MongoDB
if nc -z localhost 27017 2>/dev/null; then
    echo -e "${GREEN}✅ MongoDB is running (port 27017)${NC}"
else
    echo -e "${YELLOW}⚠️  MongoDB not detected (port 27017)${NC}"
fi

# Redis
if nc -z localhost 6379 2>/dev/null; then
    echo -e "${GREEN}✅ Redis is running (port 6379)${NC}"
else
    echo -e "${YELLOW}⚠️  Redis not detected (port 6379)${NC}"
fi

echo ""
echo "=================================="
echo -e "${BLUE}📋 Service Status Summary${NC}"
echo "=================================="
echo "User Service:    http://localhost:3001"
echo "Audio Service:   http://localhost:3002"
echo "Session Service: http://localhost:3003"
echo ""
echo "To start services: ./start-dev.sh"
echo "To start databases: docker-compose -f docker-compose.dev.yml up -d"
