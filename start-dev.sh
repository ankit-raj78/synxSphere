#!/bin/bash

# SynxSphere Development Startup Script
# Clean Architecture - Quick development environment setup

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}"
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║            🚀 SynxSphere Development Environment              ║"
echo "║                    Clean Architecture                          ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

echo -e "${BLUE}Starting development environment...${NC}"
echo ""

# Check if PostgreSQL is running
echo -e "${YELLOW}🗄️  Checking database connection...${NC}"
if npx prisma db push > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Database connected and synchronized${NC}"
else
    echo -e "${RED}❌ Database connection failed${NC}"
    echo "Please ensure PostgreSQL is running and configured correctly."
    exit 1
fi

# Start OpenDAW server in background
echo -e "${YELLOW}🎵 Starting OpenDAW server...${NC}"
if npm run opendaw:start > /dev/null 2>&1 &then
    echo -e "${GREEN}✅ OpenDAW server starting in background${NC}"
    OPENDAW_PID=$!
else
    echo -e "${YELLOW}⚠️  OpenDAW server may already be running${NC}"
fi

# Wait for OpenDAW to initialize
sleep 3

# Start Next.js development server
echo -e "${YELLOW}⚡ Starting Next.js development server...${NC}"
echo -e "${CYAN}   This will run in the foreground. Press Ctrl+C to stop.${NC}"
echo ""

# Set up cleanup trap
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 Shutting down services...${NC}"
    if [ ! -z "$OPENDAW_PID" ]; then
        kill $OPENDAW_PID 2>/dev/null || true
    fi
    npm run opendaw:stop > /dev/null 2>&1 || true
    echo -e "${GREEN}✅ Cleanup completed${NC}"
}

trap cleanup EXIT

# Start the main development server
npm run dev
