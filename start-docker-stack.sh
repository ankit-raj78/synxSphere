#!/bin/bash

# SynxSphere Docker Stack Startup Script
# This script builds and starts all services using Docker Compose

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🐳 Starting SynxSphere Docker Stack...${NC}"

# Function to check if Docker is running
check_docker() {
    if ! docker info >/dev/null 2>&1; then
        echo -e "${RED}❌ Docker is not running. Please start Docker first.${NC}"
        exit 1
    fi
}

# Function to check if docker-compose is available
check_docker_compose() {
    if ! command -v docker-compose >/dev/null 2>&1 && ! docker compose version >/dev/null 2>&1; then
        echo -e "${RED}❌ Docker Compose is not available.${NC}"
        exit 1
    fi
}

# Set the compose command
if command -v docker-compose >/dev/null 2>&1; then
    COMPOSE_CMD="docker-compose"
else
    COMPOSE_CMD="docker compose"
fi

echo -e "${BLUE}📋 Checking prerequisites...${NC}"
check_docker
check_docker_compose
echo -e "${GREEN}✅ Docker is ready${NC}"

# Stop and remove existing containers
echo -e "${BLUE}🧹 Cleaning up existing containers...${NC}"
$COMPOSE_CMD -f docker-compose.full-stack.yml down --remove-orphans
docker system prune -f --volumes

# Build and start services
echo -e "${BLUE}🏗️ Building and starting services...${NC}"
$COMPOSE_CMD -f docker-compose.full-stack.yml up --build -d

# Wait for services to be healthy
echo -e "${BLUE}⏳ Waiting for services to be ready...${NC}"

services=("postgres" "redis" "collaboration-server" "opendaw-studio" "synxsphere-app")
for service in "${services[@]}"; do
    echo -e "${YELLOW}   Waiting for $service...${NC}"
    timeout=60
    while [ $timeout -gt 0 ]; do
        if $COMPOSE_CMD -f docker-compose.full-stack.yml ps $service | grep -q "healthy\|Up"; then
            echo -e "${GREEN}   ✅ $service is ready${NC}"
            break
        fi
        sleep 2
        ((timeout-=2))
    done
    
    if [ $timeout -le 0]; then
        echo -e "${RED}   ❌ $service failed to start${NC}"
    fi
done

# Show service status
echo -e "${BLUE}📊 Service Status:${NC}"
$COMPOSE_CMD -f docker-compose.full-stack.yml ps

echo -e "${GREEN}🎉 SynxSphere Docker stack is running!${NC}"
echo ""
echo -e "${BLUE}🔗 Available Services:${NC}"
echo -e "  Main Application:     ${YELLOW}http://localhost:3000${NC}"
echo -e "  OpenDAW Studio:       ${YELLOW}http://localhost:8080${NC}"
echo -e "  Collaboration API:    ${YELLOW}http://localhost:3003${NC}"
echo -e "  Collaboration WS:     ${YELLOW}ws://localhost:3004${NC}"
echo -e "  PostgreSQL:           ${YELLOW}localhost:5433${NC}"
echo -e "  Redis:                ${YELLOW}localhost:6379${NC}"
echo ""
echo -e "${BLUE}📝 Useful Commands:${NC}"
echo -e "  View logs:            ${YELLOW}$COMPOSE_CMD -f docker-compose.full-stack.yml logs -f [service]${NC}"
echo -e "  Stop all services:    ${YELLOW}$COMPOSE_CMD -f docker-compose.full-stack.yml down${NC}"
echo -e "  Restart service:      ${YELLOW}$COMPOSE_CMD -f docker-compose.full-stack.yml restart [service]${NC}"
echo -e "  View status:          ${YELLOW}$COMPOSE_CMD -f docker-compose.full-stack.yml ps${NC}"
echo ""
echo -e "${GREEN}🚀 Ready for collaboration testing!${NC}"
