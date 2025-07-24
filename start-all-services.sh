#!/bin/bash

# SynxSphere Complete Stack Startup Script
# This script starts all services required for the full SynxSphere experience

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Service ports
MAIN_APP_PORT=3000
COLLABORATION_WS_PORT=3004
COLLABORATION_HTTP_PORT=3003
OPENDAW_PORT=8080
POSTGRES_PORT=5433
REDIS_PORT=6379
ADMINER_PORT=8081

echo -e "${BLUE}🚀 Starting SynxSphere Complete Stack...${NC}"

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if a port is in use
port_in_use() {
    lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1
}

# Function to wait for a service to be ready
wait_for_service() {
    local host=$1
    local port=$2
    local service_name=$3
    local max_attempts=30
    local attempt=1

    echo -e "${YELLOW}⏳ Waiting for $service_name to be ready...${NC}"
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s --connect-timeout 2 "$host:$port" >/dev/null 2>&1 || nc -z $host $port 2>/dev/null; then
            echo -e "${GREEN}✅ $service_name is ready!${NC}"
            return 0
        fi
        
        echo -e "${YELLOW}   Attempt $attempt/$max_attempts - waiting for $service_name...${NC}"
        sleep 2
        ((attempt++))
    done
    
    echo -e "${RED}❌ $service_name failed to start within expected time${NC}"
    return 1
}

# Check prerequisites
echo -e "${BLUE}📋 Checking prerequisites...${NC}"

if ! command_exists docker; then
    echo -e "${RED}❌ Docker is required but not installed${NC}"
    exit 1
fi

if ! command_exists npm; then
    echo -e "${RED}❌ npm is required but not installed${NC}"
    exit 1
fi

if ! command_exists node; then
    echo -e "${RED}❌ Node.js is required but not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites satisfied${NC}"

# Stop existing services
echo -e "${BLUE}🧹 Cleaning up existing services...${NC}"

# Stop any running Next.js processes
pkill -f "next dev" 2>/dev/null || true

# Stop any running OpenDAW processes
pkill -f "vite.*openDAW" 2>/dev/null || true
pkill -f "opendaw" 2>/dev/null || true

# Stop collaboration server
pkill -f "ts-node.*server/index.ts" 2>/dev/null || true

# Stop any local Redis processes
pkill -f "redis-server" 2>/dev/null || true

# Stop Docker containers
cd /Users/ankitraj2/synxSphere/opendaw-collab-mvp
docker-compose down 2>/dev/null || true

# Kill any processes using our target ports
lsof -ti:3000,3003,3004,5433,6379,8080,8081 | xargs kill -9 2>/dev/null || true

# Stop Adminer container if running
docker stop opendaw_collab_adminer 2>/dev/null || true
docker rm opendaw_collab_adminer 2>/dev/null || true

sleep 3

# Start database services
echo -e "${BLUE}🗄️ Starting database services...${NC}"
cd /Users/ankitraj2/synxSphere/opendaw-collab-mvp
docker-compose up -d postgres redis adminer

# Wait for database to be ready
wait_for_service localhost $POSTGRES_PORT "PostgreSQL"
wait_for_service localhost $REDIS_PORT "Redis"
wait_for_service localhost $ADMINER_PORT "Adminer Database Interface"

# Install dependencies if needed
echo -e "${BLUE}📦 Installing/updating dependencies...${NC}"

# Main app dependencies
cd /Users/ankitraj2/synxSphere
if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
    echo -e "${YELLOW}   Installing main app dependencies...${NC}"
    npm install
fi

# Collaboration server dependencies
cd /Users/ankitraj2/synxSphere/opendaw-collab-mvp
if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
    echo -e "${YELLOW}   Installing collaboration server dependencies...${NC}"
    npm install
fi

# OpenDAW dependencies
cd /Users/ankitraj2/synxSphere/openDAW/studio
if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
    echo -e "${YELLOW}   Installing OpenDAW dependencies...${NC}"
    npm install
fi

# Start collaboration server
echo -e "${BLUE}🔌 Starting collaboration server...${NC}"
cd /Users/ankitraj2/synxSphere/opendaw-collab-mvp
nohup npm run dev > collaboration-server.log 2>&1 &
COLLABORATION_PID=$!

# Wait for collaboration server
wait_for_service localhost $COLLABORATION_WS_PORT "Collaboration WebSocket"
wait_for_service localhost $COLLABORATION_HTTP_PORT "Collaboration HTTP API"

# Start OpenDAW Studio
echo -e "${BLUE}🎵 Starting OpenDAW Studio...${NC}"
cd /Users/ankitraj2/synxSphere/openDAW/studio

# Check if SSL certificates exist and copy them to the expected location
if [ ! -f "/Users/ankitraj2/synxSphere/localhost.pem" ] || [ ! -f "/Users/ankitraj2/synxSphere/localhost-key.pem" ]; then
    echo -e "${YELLOW}⚠️ SSL certificates not found. OpenDAW will run without HTTPS.${NC}"
    # Remove HTTPS config temporarily
    sed -i.bak 's/https: {/\/\/ https: {/' vite.config.ts
    sed -i.bak 's/key: readFileSync/\/\/ key: readFileSync/' vite.config.ts  
    sed -i.bak 's/cert: readFileSync/\/\/ cert: readFileSync/' vite.config.ts
    sed -i.bak 's/},$/\/\/ },/' vite.config.ts
else
    echo -e "${GREEN}🔒 SSL certificates found. Starting OpenDAW with HTTPS...${NC}"
    # Copy certificates to the expected location
    cp /Users/ankitraj2/synxSphere/localhost.pem ../localhost.pem
    cp /Users/ankitraj2/synxSphere/localhost-key.pem ../localhost-key.pem
fi

nohup npm run dev > ../opendaw-studio.log 2>&1 &

OPENDAW_PID=$!

# Wait for OpenDAW to be ready
wait_for_service localhost $OPENDAW_PORT "OpenDAW Studio"

# Start main SynxSphere application
echo -e "${BLUE}🌐 Starting main SynxSphere application...${NC}"
cd /Users/ankitraj2/synxSphere
nohup npm run dev > synxsphere-app.log 2>&1 &
MAIN_APP_PID=$!

# Wait for main app
wait_for_service localhost $MAIN_APP_PORT "SynxSphere Main App"

echo -e "${GREEN}🎉 All services started successfully!${NC}"
echo ""
echo -e "${BLUE}📊 Service Status:${NC}"
echo -e "${GREEN}✅ PostgreSQL Database:${NC}    localhost:$POSTGRES_PORT"
echo -e "${GREEN}✅ Redis Cache:${NC}             localhost:$REDIS_PORT"
echo -e "${GREEN}✅ Adminer (DB Admin):${NC}      http://localhost:$ADMINER_PORT"
echo -e "${GREEN}✅ Collaboration WebSocket:${NC} ws://localhost:$COLLABORATION_WS_PORT"
echo -e "${GREEN}✅ Collaboration HTTP API:${NC}  http://localhost:$COLLABORATION_HTTP_PORT"
echo -e "${GREEN}✅ OpenDAW Studio:${NC}          https://localhost:$OPENDAW_PORT"
echo -e "${GREEN}✅ SynxSphere Main App:${NC}     http://localhost:$MAIN_APP_PORT"
echo ""
echo -e "${BLUE}🔗 Quick Links:${NC}"
echo -e "  Main Application:     ${YELLOW}http://localhost:$MAIN_APP_PORT${NC}"
echo -e "  OpenDAW Studio:       ${YELLOW}https://localhost:$OPENDAW_PORT${NC}"
echo -e "  Database Admin:       ${YELLOW}http://localhost:$ADMINER_PORT${NC}"
echo -e "  Collaboration Test:   ${YELLOW}file:///Users/ankitraj2/synxSphere/opendaw-collab-mvp/test-collaboration.html${NC}"
echo ""
echo -e "${BLUE}📝 Process IDs:${NC}"
echo -e "  Collaboration Server: $COLLABORATION_PID"
echo -e "  OpenDAW Studio:       $OPENDAW_PID"
echo -e "  Main Application:     $MAIN_APP_PID"
echo ""
echo -e "${BLUE}📋 Log Files:${NC}"
echo -e "  Collaboration:        /Users/ankitraj2/synxSphere/opendaw-collab-mvp/collaboration-server.log"
echo -e "  OpenDAW:              /Users/ankitraj2/synxSphere/openDAW/opendaw-studio.log"
echo -e "  Main App:             /Users/ankitraj2/synxSphere/synxsphere-app.log"
echo ""
echo -e "${YELLOW}💡 To stop all services, run:${NC} ./stop-all-services.sh"
echo -e "${YELLOW}💡 To view logs, run:${NC} tail -f <log-file>"

# Save PIDs for stop script
echo "$COLLABORATION_PID" > /tmp/synxsphere-collaboration.pid
echo "$OPENDAW_PID" > /tmp/synxsphere-opendaw.pid
echo "$MAIN_APP_PID" > /tmp/synxsphere-main.pid

echo -e "${GREEN}🚀 SynxSphere stack is now ready for collaboration testing!${NC}"
