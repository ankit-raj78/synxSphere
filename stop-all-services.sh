#!/bin/bash

# SynxSphere Complete Stack Stop Script
# This script stops all services started by start-all-services.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🛑 Stopping SynxSphere Complete Stack...${NC}"

# Stop processes by PID if available
if [ -f "/tmp/synxsphere-collaboration.pid" ]; then
    COLLABORATION_PID=$(cat /tmp/synxsphere-collaboration.pid)
    echo -e "${YELLOW}🔌 Stopping collaboration server (PID: $COLLABORATION_PID)...${NC}"
    kill $COLLABORATION_PID 2>/dev/null || true
    rm -f /tmp/synxsphere-collaboration.pid
fi

if [ -f "/tmp/synxsphere-opendaw.pid" ]; then
    OPENDAW_PID=$(cat /tmp/synxsphere-opendaw.pid)
    echo -e "${YELLOW}🎵 Stopping OpenDAW studio (PID: $OPENDAW_PID)...${NC}"
    kill $OPENDAW_PID 2>/dev/null || true
    rm -f /tmp/synxsphere-opendaw.pid
fi

if [ -f "/tmp/synxsphere-main.pid" ]; then
    MAIN_APP_PID=$(cat /tmp/synxsphere-main.pid)
    echo -e "${YELLOW}🌐 Stopping main application (PID: $MAIN_APP_PID)...${NC}"
    kill $MAIN_APP_PID 2>/dev/null || true
    rm -f /tmp/synxsphere-main.pid
fi

# Fallback: kill by process name
echo -e "${YELLOW}🧹 Cleaning up any remaining processes...${NC}"

# Stop Next.js processes
pkill -f "next dev" 2>/dev/null || true

# Stop OpenDAW processes
pkill -f "vite.*openDAW" 2>/dev/null || true
pkill -f "opendaw" 2>/dev/null || true

# Stop collaboration server
pkill -f "ts-node.*server/index.ts" 2>/dev/null || true

# Stop Docker containers
echo -e "${YELLOW}🐳 Stopping Docker containers...${NC}"
cd /Users/ankitraj2/synxSphere/opendaw-collab-mvp
docker-compose down 2>/dev/null || true

# Clean up log files
echo -e "${YELLOW}📝 Cleaning up log files...${NC}"
rm -f /Users/ankitraj2/synxSphere/opendaw-collab-mvp/collaboration-server.log
rm -f /Users/ankitraj2/synxSphere/openDAW/opendaw-studio.log
rm -f /Users/ankitraj2/synxSphere/synxsphere-app.log

sleep 2

echo -e "${GREEN}✅ All SynxSphere services have been stopped${NC}"
echo -e "${BLUE}💡 To start all services again, run:${NC} ./start-all-services.sh"
