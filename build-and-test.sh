#!/bin/bash

# SyncSphere Build and Test Script for macOS
# This script builds the application and runs tests locally

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_step() {
    echo -e "${BLUE}==== $1 ====${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

build_frontend() {
    print_step "Building Frontend Application"
    
    if [ ! -f "package.json" ]; then
        print_error "package.json not found"
        exit 1
    fi
    
    print_step "Installing dependencies"
    npm install
    
    print_step "Building Next.js application"
    npm run build
    
    print_success "Frontend build completed"
}

build_docker_image() {
    print_step "Building Docker Image"
    
    if [ ! -f "Dockerfile.production" ]; then
        print_error "Dockerfile.production not found"
        exit 1
    fi
    
    docker build -f Dockerfile.production -t syncsphere:latest .
    print_success "Docker image built successfully"
}

test_docker_image() {
    print_step "Testing Docker Image"
    
    # Check if image exists
    if ! docker images | grep -q syncsphere; then
        print_error "Docker image not found. Run build first."
        exit 1
    fi
    
    print_step "Running container health check"
    CONTAINER_ID=$(docker run -d -p 3000:3000 syncsphere:latest)
    
    # Wait a few seconds for container to start
    sleep 5
    
    # Check if container is running
    if docker ps | grep -q $CONTAINER_ID; then
        print_success "Container is running"
        
        # Test HTTP endpoint (if available)
        if curl -s http://localhost:3000 > /dev/null 2>&1; then
            print_success "Application is responding"
        else
            print_warning "Application may not be ready yet"
        fi
        
        # Stop and remove container
        docker stop $CONTAINER_ID > /dev/null
        docker rm $CONTAINER_ID > /dev/null
        
        print_success "Docker image test completed"
    else
        print_error "Container failed to start"
        docker logs $CONTAINER_ID
        docker rm $CONTAINER_ID > /dev/null
        exit 1
    fi
}

run_unit_tests() {
    print_step "Running Unit Tests"
    
    if grep -q '"test"' package.json; then
        npm test
        print_success "Unit tests completed"
    else
        print_warning "No test script found in package.json"
    fi
}

lint_code() {
    print_step "Linting Code"
    
    if grep -q '"lint"' package.json; then
        npm run lint
        print_success "Linting completed"
    else
        print_warning "No lint script found in package.json"
    fi
}

check_environment() {
    print_step "Checking Environment"
    
    # Check for required environment file
    if [ ! -f ".env.local" ]; then
        print_warning ".env.local file not found"
    else
        print_success ".env.local file exists"
    fi
    
    # Check Node.js version
    NODE_VERSION=$(node --version)
    print_success "Node.js version: $NODE_VERSION"
    
    # Check npm version
    NPM_VERSION=$(npm --version)
    print_success "npm version: $NPM_VERSION"
    
    # Check Docker version
    if command -v docker &> /dev/null; then
        DOCKER_VERSION=$(docker --version)
        print_success "Docker version: $DOCKER_VERSION"
    else
        print_warning "Docker not installed"
    fi
}

main() {
    echo -e "${GREEN}"
    echo "╔═══════════════════════════════════════════════╗"
    echo "║        SyncSphere Build and Test Script      ║"
    echo "║                macOS Version                  ║"
    echo "╚═══════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    check_environment
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --frontend-only)
                build_frontend
                run_unit_tests
                lint_code
                exit 0
                ;;
            --docker-only)
                build_docker_image
                test_docker_image
                exit 0
                ;;
            --test-only)
                run_unit_tests
                lint_code
                exit 0
                ;;
            -h|--help)
                echo "Usage: $0 [OPTIONS]"
                echo "Options:"
                echo "  --frontend-only   Build frontend and run tests only"
                echo "  --docker-only     Build and test Docker image only"
                echo "  --test-only       Run tests and linting only"
                echo "  -h, --help        Show this help message"
                exit 0
                ;;
            *)
                echo "Unknown option $1"
                exit 1
                ;;
        esac
    done
    
    # Default: run all
    build_frontend
    run_unit_tests
    lint_code
    build_docker_image
    test_docker_image
    
    print_success "All build and test steps completed successfully!"
}

# Run main function
main "$@"
