#!/bin/bash

# ============================================================================
# OpenDAW Collaboration - Docker Deployment Script
# ============================================================================
# 
# This script sets up and deploys the entire OpenDAW collaboration system
# using Docker containers for easy team sharing and deployment.
#
# Usage:
#   ./deploy-docker.sh [dev|prod] [up|down|restart|logs]
#
# Examples:
#   ./deploy-docker.sh dev up       # Start development environment
#   ./deploy-docker.sh prod up      # Start production environment
#   ./deploy-docker.sh dev logs     # View development logs
#   ./deploy-docker.sh prod down    # Stop production environment
# ============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
ENVIRONMENT=${1:-dev}
ACTION=${2:-up}

echo -e "${CYAN}============================================================================${NC}"
echo -e "${CYAN}🐳 OpenDAW Collaboration - Docker Deployment${NC}"
echo -e "${CYAN}============================================================================${NC}"
echo ""
echo -e "${BLUE}Environment: ${YELLOW}$ENVIRONMENT${NC}"
echo -e "${BLUE}Action: ${YELLOW}$ACTION${NC}"
echo ""

# Function to print step headers
print_step() {
    echo ""
    echo -e "${GREEN}==== $1 ====${NC}"
}

# Function to print substeps
print_substep() {
    echo -e "${YELLOW}→ $1${NC}"
}

# Validate parameters
if [[ "$ENVIRONMENT" != "dev" && "$ENVIRONMENT" != "prod" ]]; then
    echo -e "${RED}❌ Invalid environment. Use 'dev' or 'prod'${NC}"
    exit 1
fi

if [[ "$ACTION" != "up" && "$ACTION" != "down" && "$ACTION" != "restart" && "$ACTION" != "logs" && "$ACTION" != "build" ]]; then
    echo -e "${RED}❌ Invalid action. Use 'up', 'down', 'restart', 'logs', or 'build'${NC}"
    exit 1
fi

# Set docker-compose file based on environment
if [[ "$ENVIRONMENT" == "dev" ]]; then
    COMPOSE_FILE="docker-compose.dev.yml"
    ENV_FILE=".env.dev"
else
    COMPOSE_FILE="docker-compose.production.yml"
    ENV_FILE=".env.production"
fi

print_step "1. Pre-deployment Checks"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed${NC}"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed${NC}"
    exit 1
fi

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo -e "${RED}❌ Docker is not running${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker and Docker Compose are available${NC}"

print_step "2. Environment Setup"

# Create environment file if it doesn't exist
if [[ ! -f "$ENV_FILE" ]]; then
    print_substep "Creating $ENV_FILE"
    
    if [[ "$ENVIRONMENT" == "dev" ]]; then
        cat > "$ENV_FILE" << 'EOF'
# Development Environment Variables
NODE_ENV=development
LOG_LEVEL=debug

# Database
POSTGRES_USER=opendaw
POSTGRES_PASSWORD=collaboration
POSTGRES_DB=opendaw_collab
DATABASE_URL=postgresql://opendaw:collaboration@postgres:5432/opendaw_collab

# Redis
REDIS_URL=redis://redis:6379

# API Ports
WS_PORT=3005
HTTP_PORT=3003

# Frontend URLs
NEXT_PUBLIC_API_URL=http://localhost:3003/api
NEXT_PUBLIC_WS_URL=ws://localhost:3005
NEXT_PUBLIC_OPENDAW_URL=https://localhost:8080

# OpenDAW Environment
VITE_API_URL=http://localhost:3003/api
VITE_WS_URL=ws://localhost:3005
VITE_SYNXSPHERE_URL=http://localhost:3000
EOF
    else
        cat > "$ENV_FILE" << 'EOF'
# Production Environment Variables
NODE_ENV=production
LOG_LEVEL=info

# Database
POSTGRES_USER=opendaw
POSTGRES_PASSWORD=collaboration
POSTGRES_DB=opendaw_collab
DATABASE_URL=postgresql://opendaw:collaboration@postgres:5432/opendaw_collab

# Redis
REDIS_URL=redis://redis:6379

# API Ports
WS_PORT=3005
HTTP_PORT=3003

# Frontend URLs (adjust for your domain)
NEXT_PUBLIC_API_URL=https://your-domain.com/api
NEXT_PUBLIC_WS_URL=wss://your-domain.com/ws
NEXT_PUBLIC_OPENDAW_URL=https://your-domain.com:8080

# OpenDAW Environment
OPENDAW_API_URL=http://collaboration:3003/api
OPENDAW_WS_URL=ws://collaboration:3005
SYNXSPHERE_URL=http://synxsphere:3000
EOF
    fi
    
    echo -e "${GREEN}✅ Created $ENV_FILE${NC}"
else
    echo -e "${GREEN}✅ Using existing $ENV_FILE${NC}"
fi

# Create logs directory
mkdir -p logs

print_step "3. Docker Operations"

case $ACTION in
    "up")
        print_substep "Starting $ENVIRONMENT environment"
        docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d
        
        print_substep "Waiting for services to be ready..."
        sleep 30
        
        print_substep "Checking service health"
        docker-compose -f "$COMPOSE_FILE" ps
        
        echo ""
        echo -e "${GREEN}✅ Environment started successfully!${NC}"
        echo ""
        echo -e "${CYAN}🔗 Access URLs:${NC}"
        if [[ "$ENVIRONMENT" == "dev" ]]; then
            echo -e "   📊 SynxSphere Dashboard: ${BLUE}http://localhost:3000${NC}"
            echo -e "   🎵 OpenDAW Studio: ${BLUE}https://localhost:8080${NC}"
            echo -e "   📡 Collaboration API: ${BLUE}http://localhost:3003/api/health${NC}"
            echo -e "   🗄️  Database Admin: ${BLUE}http://localhost:8081${NC}"
        else
            echo -e "   📊 SynxSphere Dashboard: ${BLUE}http://localhost:3000${NC}"
            echo -e "   🎵 OpenDAW Studio: ${BLUE}https://localhost:8080${NC}"
            echo -e "   📡 Collaboration API: ${BLUE}http://localhost:3003/api/health${NC}"
            echo -e "   🗄️  Database Admin: ${BLUE}http://localhost:8081${NC}"
        fi
        echo ""
        echo -e "${CYAN}🧪 Test Collaboration:${NC}"
        echo -e "   User 1: ${BLUE}https://localhost:8080/?collaborative=true&projectId=test&userId=user1&userName=Alice${NC}"
        echo -e "   User 2: ${BLUE}https://localhost:8080/?collaborative=true&projectId=test&userId=user2&userName=Bob${NC}"
        ;;
        
    "down")
        print_substep "Stopping $ENVIRONMENT environment"
        docker-compose -f "$COMPOSE_FILE" down
        echo -e "${GREEN}✅ Environment stopped${NC}"
        ;;
        
    "restart")
        print_substep "Restarting $ENVIRONMENT environment"
        docker-compose -f "$COMPOSE_FILE" restart
        echo -e "${GREEN}✅ Environment restarted${NC}"
        ;;
        
    "logs")
        print_substep "Showing logs for $ENVIRONMENT environment"
        docker-compose -f "$COMPOSE_FILE" logs -f
        ;;
        
    "build")
        print_substep "Building images for $ENVIRONMENT environment"
        docker-compose -f "$COMPOSE_FILE" build --no-cache
        echo -e "${GREEN}✅ Images built successfully${NC}"
        ;;
esac

print_step "4. Useful Commands"

echo -e "${CYAN}📋 Management Commands:${NC}"
echo -e "   View logs:     ${YELLOW}./deploy-docker.sh $ENVIRONMENT logs${NC}"
echo -e "   Stop services: ${YELLOW}./deploy-docker.sh $ENVIRONMENT down${NC}"
echo -e "   Restart:       ${YELLOW}./deploy-docker.sh $ENVIRONMENT restart${NC}"
echo -e "   Rebuild:       ${YELLOW}./deploy-docker.sh $ENVIRONMENT build${NC}"
echo ""
echo -e "${CYAN}🔧 Debug Commands:${NC}"
echo -e "   Service status: ${YELLOW}docker-compose -f $COMPOSE_FILE ps${NC}"
echo -e "   Container logs: ${YELLOW}docker-compose -f $COMPOSE_FILE logs [service]${NC}"
echo -e "   Execute shell:  ${YELLOW}docker-compose -f $COMPOSE_FILE exec [service] sh${NC}"
echo ""
echo -e "${CYAN}📊 Monitoring:${NC}"
echo -e "   Health check:   ${YELLOW}curl http://localhost:3003/api/health${NC}"
echo -e "   Database:       ${YELLOW}docker-compose -f $COMPOSE_FILE exec postgres psql -U opendaw -d opendaw_collab${NC}"
echo ""

if [[ "$ACTION" == "up" ]]; then
    echo -e "${GREEN}🎉 OpenDAW Collaboration is ready for your team!${NC}"
    echo -e "${GREEN}Share this repository and the deployment commands with your team.${NC}"
fi

echo ""
