#!/bin/bash

# SynxSphere Docker Stack Stop Script
# This script stops all Docker services

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🛑 Stopping SynxSphere Docker Stack...${NC}"

# Set the compose command
if command -v docker-compose >/dev/null 2>&1; then
    COMPOSE_CMD="docker-compose"
else
    COMPOSE_CMD="docker compose"
fi

# Stop all services
echo -e "${YELLOW}📦 Stopping containers...${NC}"
$COMPOSE_CMD -f docker-compose.full-stack.yml down

# Optionally remove volumes (uncomment if needed)
# echo -e "${YELLOW}🗑️ Removing volumes...${NC}"
# $COMPOSE_CMD -f docker-compose.full-stack.yml down -v

# Clean up unused resources
echo -e "${YELLOW}🧹 Cleaning up unused resources...${NC}"
docker system prune -f

echo -e "${GREEN}✅ SynxSphere Docker stack has been stopped${NC}"
echo -e "${BLUE}💡 To start again, run:${NC} ./start-docker-stack.sh"
