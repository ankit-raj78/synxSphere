#!/bin/bash

# SynxSphere Troubleshooting Script
# Run this script if you're having issues starting services

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔧 SynxSphere Troubleshooting Tool${NC}"
echo "=================================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Not in SynxSphere project directory${NC}"
    echo "Please run this script from the SynxSphere project root"
    exit 1
fi

echo -e "${YELLOW}📋 System Check...${NC}"

# Check Node.js
if command -v node &> /dev/null; then
    node_version=$(node --version)
    echo -e "${GREEN}✅ Node.js: $node_version${NC}"
else
    echo -e "${RED}❌ Node.js not found${NC}"
    echo "Please install Node.js from https://nodejs.org/"
fi

# Check npm
if command -v npm &> /dev/null; then
    npm_version=$(npm --version)
    echo -e "${GREEN}✅ npm: $npm_version${NC}"
else
    echo -e "${RED}❌ npm not found${NC}"
fi

# Check dependencies
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✅ Main dependencies installed${NC}"
else
    echo -e "${RED}❌ Main dependencies missing${NC}"
    echo "Run: npm install"
fi

if [ -d "openDAW/studio/node_modules" ]; then
    echo -e "${GREEN}✅ OpenDAW dependencies installed${NC}"
else
    echo -e "${RED}❌ OpenDAW dependencies missing${NC}"
    echo "Run: cd openDAW/studio && npm install && cd ../.."
fi

# Check SSL certificates
if [ -f "openDAW/cert.pem" ] && [ -f "openDAW/key.pem" ]; then
    echo -e "${GREEN}✅ SSL certificates found${NC}"
else
    echo -e "${RED}❌ SSL certificates missing${NC}"
    echo "Run: cd openDAW && bash cert.sh && cd .."
fi

echo ""
echo -e "${YELLOW}🔍 Port Check...${NC}"

# Check port 3000
if lsof -i :3000 > /dev/null 2>&1; then
    pid=$(lsof -t -i :3000)
    echo -e "${YELLOW}⚠️  Port 3000 is in use (PID: $pid)${NC}"
    echo "This might be the React app already running"
else
    echo -e "${GREEN}✅ Port 3000 is available${NC}"
fi

# Check port 8080
if lsof -i :8080 > /dev/null 2>&1; then
    pid=$(lsof -t -i :8080)
    echo -e "${YELLOW}⚠️  Port 8080 is in use (PID: $pid)${NC}"
    echo "This might be OpenDAW already running"
else
    echo -e "${GREEN}✅ Port 8080 is available${NC}"
fi

echo ""
echo -e "${YELLOW}🌐 Service Status...${NC}"

# Check if services are responding
if curl -s -I "http://localhost:3000" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ React app is responding at http://localhost:3000${NC}"
else
    echo -e "${RED}❌ React app is not responding${NC}"
fi

if curl -s -I -k "https://localhost:8080" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ OpenDAW is responding at https://localhost:8080${NC}"
else
    echo -e "${RED}❌ OpenDAW is not responding${NC}"
fi

echo ""
echo -e "${BLUE}🛠️  Common Solutions:${NC}"
echo ""
echo "1. First time setup:"
echo "   ./start.sh"
echo ""
echo "2. Install missing dependencies:"
echo "   npm install"
echo "   cd openDAW/studio && npm install && cd ../.."
echo ""
echo "3. Generate SSL certificates:"
echo "   cd openDAW && bash cert.sh && cd .."
echo ""
echo "4. Clear port conflicts:"
echo "   npm run services:stop"
echo ""
echo "5. Start services:"
echo "   npm run services:start"
echo "   # OR"
echo "   ./launch.sh"
echo ""
echo "6. Check service status:"
echo "   npm run services:status"
echo ""

echo -e "${YELLOW}💡 Need more help? Check:${NC}"
echo "   docs/QUICK_START_GUIDE.md"
echo "   docs/SERVICES_SETUP_GUIDE.md"
