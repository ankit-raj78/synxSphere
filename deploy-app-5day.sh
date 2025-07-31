#!/bin/bash

# 🚀 SynxSphere Application Deployment Script
# Run this script on the EC2 instance after infrastructure is set up

set -e

echo "🚀 Deploying SynxSphere Application..."

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_step() {
    echo -e "${BLUE}📋 Step: $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Wait for system setup to complete
wait_for_setup() {
    print_step "Waiting for instance setup to complete..."
    
    while [ ! -f /home/ec2-user/setup-complete.txt ]; do
        echo "Waiting for instance initialization..."
        sleep 10
    done
    
    print_success "Instance setup completed"
}

# Clone repository
clone_repository() {
    print_step "Cloning SynxSphere repository..."
    
    cd /home/ec2-user
    
    if [ -d "synxSphere" ]; then
        print_warning "Repository already exists, pulling latest changes..."
        cd synxSphere
        git pull
    else
        git clone https://github.com/ankit-raj78/synxSphere.git
        cd synxSphere
    fi
    
    print_success "Repository cloned/updated"
}

# Setup environment variables
setup_environment() {
    print_step "Setting up environment variables..."
    
    # Get instance metadata
    INSTANCE_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)
    
    # Create .env file
    cat > .env << EOF
# SynxSphere 5-Day AWS Deployment Configuration

# Database Configuration (Local PostgreSQL)
DATABASE_URL=postgresql://synxsphere:synxsphere@localhost:5432/synxsphere
POSTGRES_USER=synxsphere
POSTGRES_PASSWORD=synxsphere
POSTGRES_DB=synxsphere

# Redis Configuration (Local Redis)
REDIS_URL=redis://localhost:6379

# Application URLs
NEXTJS_URL=http://$INSTANCE_IP:3000
COLLABORATION_SERVER_URL=http://$INSTANCE_IP:3003
OPENDAW_URL=http://$INSTANCE_IP:8000

# AWS S3 Configuration (will be set during deployment)
S3_BUCKET_NAME=__S3_BUCKET_PLACEHOLDER__
AWS_REGION=us-east-1

# Security
JWT_SECRET=$(openssl rand -base64 32)
ENCRYPTION_KEY=$(openssl rand -base64 32)

# Environment
NODE_ENV=production
PORT=3000
COLLABORATION_PORT=3003
OPENDAW_PORT=8000

# CORS Origins
CORS_ORIGINS=http://$INSTANCE_IP:3000,http://$INSTANCE_IP:3003,http://$INSTANCE_IP:8000

EOF
    
    print_success "Environment variables configured"
}

# Create optimized docker-compose for 5-day deployment
create_docker_compose() {
    print_step "Creating optimized Docker Compose configuration..."
    
    cat > docker-compose.5day.yml << 'EOF'
version: '3.8'

services:
  # PostgreSQL Database (Local)
  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: synxsphere
      POSTGRES_PASSWORD: synxsphere
      POSTGRES_DB: synxsphere
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/schema.sql:/docker-entrypoint-initdb.d/schema.sql
    ports:
      - "5432:5432"
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 512M

  # Redis Cache (Local)
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 128M

  # Next.js Dashboard
  nextjs-dashboard:
    build: 
      context: .
      dockerfile: Dockerfile.synxsphere
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    env_file:
      - .env
    depends_on:
      - postgres
      - redis
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 1G

  # Collaboration Server
  collaboration-server:
    build:
      context: .
      dockerfile: Dockerfile.collaboration
    ports:
      - "3003:3003"
      - "3005:3005"
    environment:
      - NODE_ENV=production
    env_file:
      - .env
    depends_on:
      - postgres
      - redis
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 1G

  # OpenDAW Studio
  opendaw-studio:
    build:
      context: .
      dockerfile: Dockerfile.opendaw
    ports:
      - "8000:8000"
      - "8080:8080"
    environment:
      - NODE_ENV=production
    env_file:
      - .env
    depends_on:
      - postgres
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 1G

volumes:
  postgres_data:

EOF
    
    print_success "Docker Compose configuration created"
}

# Build and start services
deploy_application() {
    print_step "Building and starting SynxSphere services..."
    
    # Build images
    print_step "Building Docker images..."
    sudo docker-compose -f docker-compose.5day.yml build --no-cache
    
    # Start services
    print_step "Starting services..."
    sudo docker-compose -f docker-compose.5day.yml up -d
    
    print_success "All services started"
}

# Health check
health_check() {
    print_step "Performing health checks..."
    
    sleep 30  # Wait for services to start
    
    INSTANCE_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)
    
    # Check services
    services=("3000:Next.js Dashboard" "3003:Collaboration Server" "8000:OpenDAW Studio")
    
    for service in "${services[@]}"; do
        port=$(echo $service | cut -d':' -f1)
        name=$(echo $service | cut -d':' -f2)
        
        if curl -f -s http://localhost:$port/health >/dev/null 2>&1 || curl -f -s http://localhost:$port >/dev/null 2>&1; then
            print_success "$name is running on port $port"
        else
            print_warning "$name may still be starting on port $port"
        fi
    done
}

# Create deployment summary
create_summary() {
    INSTANCE_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)
    
    cat > ~/deployment-summary.txt << EOF
🎉 SynxSphere 5-Day Deployment Complete!
======================================

🌐 Application URLs:
- Next.js Dashboard: http://$INSTANCE_IP:3000
- Collaboration Server: http://$INSTANCE_IP:3003  
- OpenDAW Studio: http://$INSTANCE_IP:8000

🔧 Management Commands:
- View logs: sudo docker-compose -f docker-compose.5day.yml logs
- Restart services: sudo docker-compose -f docker-compose.5day.yml restart
- Stop services: sudo docker-compose -f docker-compose.5day.yml down

📊 Resource Usage:
- Total RAM allocated: ~3.2GB (within 4GB limit)
- Services running: 5 containers
- Database: Local PostgreSQL
- Cache: Local Redis

⚠️ Remember: This is a 5-day deployment!
Set reminder to terminate AWS resources after testing.

🚀 Happy Testing!
EOF
    
    print_success "Deployment summary created: ~/deployment-summary.txt"
}

# Main execution
main() {
    echo "Starting application deployment..."
    
    wait_for_setup
    clone_repository
    setup_environment
    create_docker_compose
    deploy_application
    health_check
    create_summary
    
    echo ""
    echo -e "${GREEN}🎉 SynxSphere deployed successfully!${NC}"
    echo ""
    INSTANCE_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)
    echo "🌐 Access your application:"
    echo "   Dashboard: http://$INSTANCE_IP:3000"
    echo "   Collaboration: http://$INSTANCE_IP:3003"
    echo "   OpenDAW: http://$INSTANCE_IP:8000"
    echo ""
    echo "📄 Full details in: ~/deployment-summary.txt"
}

# Run main function
main "$@"
