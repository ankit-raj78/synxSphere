# 🎵 OpenDAW Collaboration System - Docker Setup Guide

Complete setup guide for running the OpenDAW collaboration system on any machine using Docker.

## 📋 Table of Contents
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [System Architecture](#system-architecture)
- [Detailed Setup](#detailed-setup)
- [Testing the System](#testing-the-system)
- [Troubleshooting](#troubleshooting)
- [Development](#development)
- [Production Deployment](#production-deployment)

## 🔧 Prerequisites

### Required Software
- **Docker Desktop** (v4.0+)
- **Docker Compose** (v2.0+)
- **Git**
- **curl** (for testing)
- **Web Browser** (Chrome/Firefox/Safari)

### System Requirements
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 2GB free space
- **CPU**: 2 cores minimum
- **Network**: Internet connection for initial setup

### Platform Support
- ✅ **macOS** (Intel/Apple Silicon)
- ✅ **Windows** (WSL2 recommended)
- ✅ **Linux** (Ubuntu/Debian/CentOS)

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/your-org/synxSphere.git
cd synxSphere
```

### 2. Start the System
```bash
# Start all services in production mode
docker-compose -f docker-compose.production.yml up -d

# Wait for all services to be healthy (2-3 minutes)
docker-compose -f docker-compose.production.yml ps
```

### 3. Initialize the Database
```bash
# Run database migrations (only needed on first setup)
docker-compose -f docker-compose.production.yml exec synxsphere npx prisma db push --accept-data-loss
```

### 4. Access the Applications
- **OpenDAW Studio**: [http://localhost:8000](http://localhost:8000)
- **SynxSphere Dashboard**: [http://localhost:3000](http://localhost:3000)
- **Database Admin**: [https://localhost:8080](https://localhost:8080) (optional)

### 5. Test User Registration
```bash
# Register first user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Alice","email":"alice@test.com","password":"password123"}'

# Register second user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Bob","email":"bob@test.com","password":"password123"}'
```

## 🏗️ System Architecture

The system consists of 5 Docker containers:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   OpenDAW       │    │   SynxSphere    │    │  Collaboration  │
│   Studio        │    │   Dashboard     │    │    Server       │
│   :8000         │    │   :3000         │    │   :3003/:3005   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
         ┌─────────────────────────────────────────────┐
         │                Database Layer               │
         ├─────────────────┬───────────────────────────┤
         │   PostgreSQL    │        Redis Cache        │
         │     :5433       │         :6379             │
         └─────────────────┴───────────────────────────┘
```

### Services Overview
- **OpenDAW Studio**: Web-based DAW for audio editing and collaboration
- **SynxSphere Dashboard**: Project management and user interface
- **Collaboration Server**: Real-time WebSocket server for live collaboration
- **PostgreSQL**: Main database for users, projects, and collaboration data
- **Redis**: Caching and session management

## 📖 Detailed Setup

### Environment Configuration

The system uses these environment files:
- `.env` - Local development configuration
- `docker-compose.production.yml` - Production Docker setup
- `docker-compose.dev.yml` - Development with hot reload

### Port Mapping

| Service | Internal Port | External Port | Protocol |
|---------|---------------|---------------|----------|
| OpenDAW Studio | 80/443 | 8000/8080 | HTTP/HTTPS |
| SynxSphere | 3000 | 3000 | HTTP |
| Collaboration API | 3003 | 3003 | HTTP |
| Collaboration WS | 3005 | 3005 | WebSocket |
| PostgreSQL | 5432 | 5433 | TCP |
| Redis | 6379 | 6379 | TCP |

### Data Persistence

Data is persisted in Docker volumes:
```bash
# View volumes
docker volume ls | grep opendaw

# Backup database
docker-compose -f docker-compose.production.yml exec postgres \
  pg_dump -U opendaw opendaw_collab > backup.sql

# Restore database
cat backup.sql | docker-compose -f docker-compose.production.yml exec -T postgres \
  psql -U opendaw opendaw_collab
```

## 🧪 Testing the System

### 1. Service Health Check
```bash
# Check all containers are running
docker-compose -f docker-compose.production.yml ps

# View logs
docker-compose -f docker-compose.production.yml logs -f
```

### 2. API Testing
```bash
# Test SynxSphere API
curl -X GET http://localhost:3000/api/health

# Test Collaboration API  
curl -X GET http://localhost:3003/api/health

# Test OpenDAW Studio
curl -I http://localhost:8000/
```

### 3. Collaboration Testing
```bash
# Run the complete collaboration test
./test-collaboration-complete.sh

# Or test manually:
# 1. Register users (see Quick Start)
# 2. Create a room
# 3. Join users to the room
# 4. Test real-time collaboration
```

### 4. Cross-Origin Isolation Testing
```bash
# Verify OpenDAW has required headers
curl -I http://localhost:8000/ | grep -E "Cross-Origin"

# Should show:
# Cross-Origin-Opener-Policy: same-origin
# Cross-Origin-Embedder-Policy: require-corp
```

## 🐛 Troubleshooting

### Common Issues

#### 1. Containers Won't Start
```bash
# Check Docker is running
docker info

# Check available resources
docker system df

# Clean up if needed
docker system prune -a
```

#### 2. Database Connection Issues
```bash
# Check database logs
docker-compose -f docker-compose.production.yml logs postgres

# Test connection
docker-compose -f docker-compose.production.yml exec postgres \
  psql -U opendaw -d opendaw_collab -c "SELECT version();"
```

#### 3. Port Conflicts
```bash
# Check what's using ports
lsof -i :3000  # SynxSphere
lsof -i :8000  # OpenDAW
lsof -i :5433  # PostgreSQL

# Change ports in docker-compose.production.yml if needed
```

#### 4. Prisma Schema Issues
```bash
# Reset and regenerate database
docker-compose -f docker-compose.production.yml exec synxsphere \
  npx prisma db push --force-reset --accept-data-loss

# Or migrate incrementally
docker-compose -f docker-compose.production.yml exec synxsphere \
  npx prisma migrate dev
```

#### 5. Cross-Origin Isolation Errors
```bash
# Rebuild OpenDAW with updated Nginx config
docker-compose -f docker-compose.production.yml build opendaw
docker-compose -f docker-compose.production.yml up -d opendaw
```

### Service-Specific Debugging

#### OpenDAW Studio
```bash
# Check if SharedArrayBuffer is available
open http://localhost:8000
# Open browser console, check for cross-origin isolation errors
```

#### SynxSphere Dashboard
```bash
# Check Next.js build
docker-compose -f docker-compose.production.yml logs synxsphere | grep -i error

# Test API endpoints
curl -X GET http://localhost:3000/api/rooms
```

#### Collaboration Server
```bash
# Test WebSocket connection
curl -X GET http://localhost:3005 
# Should return 426 Upgrade Required (expected for WebSocket)

# Check real-time functionality
# Use browser WebSocket inspector
```

### Performance Optimization

#### Resource Limits
```yaml
# Add to docker-compose.production.yml services
deploy:
  resources:
    limits:
      memory: 512M
      cpus: '0.5'
```

#### Build Optimization
```bash
# Use BuildKit for faster builds
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

# Multi-stage builds are already optimized
# but you can add --target for development
```

## 💻 Development

### Development Mode
```bash
# Start with hot reload
docker-compose -f docker-compose.dev.yml up -d

# Access development servers:
# - SynxSphere: http://localhost:3000 (Next.js dev server)
# - OpenDAW: http://localhost:8000 (built version)
# - Collaboration: http://localhost:3003 (Node.js with nodemon)
```

### Code Changes
```bash
# Rebuild specific service after changes
docker-compose -f docker-compose.production.yml build synxsphere
docker-compose -f docker-compose.production.yml up -d synxsphere

# Or rebuild all
docker-compose -f docker-compose.production.yml build
docker-compose -f docker-compose.production.yml up -d
```

### Database Development
```bash
# Access database shell
docker-compose -f docker-compose.production.yml exec postgres \
  psql -U opendaw opendaw_collab

# Run migrations
docker-compose -f docker-compose.production.yml exec synxsphere \
  npx prisma migrate dev --name "your_migration_name"

# Generate Prisma client
docker-compose -f docker-compose.production.yml exec synxsphere \
  npx prisma generate
```

## 🚀 Production Deployment

### AWS Deployment
```bash
# Use the provided AWS CDK setup
cd aws-cdk
npm install
npx cdk deploy

# Or use the ECS deployment script
./deploy-aws.sh
```

### Docker Registry
```bash
# Tag images for registry
docker tag synxsphere-synxsphere:latest your-registry/synxsphere:latest
docker tag synxsphere-opendaw:latest your-registry/opendaw:latest
docker tag synxsphere-collaboration:latest your-registry/collaboration:latest

# Push to registry
docker push your-registry/synxsphere:latest
docker push your-registry/opendaw:latest
docker push your-registry/collaboration:latest
```

### Environment Variables for Production
```bash
# Create production .env file
cp .env.example .env.production

# Update with production values:
# - Strong database passwords
# - Secure JWT secrets
# - Proper CORS origins
# - SSL certificates
```

### SSL/HTTPS Setup
```bash
# For production, update nginx/opendaw.conf with real SSL certificates
# Or use a reverse proxy like Traefik or nginx-proxy with Let's Encrypt
```

## 📚 Additional Resources

### Documentation Files
- `README-DOCKER.md` - Docker-specific setup
- `TEAM-ONBOARDING.md` - Team member onboarding
- `INSTALLATION-GUIDE.md` - Detailed installation steps
- `AUDIO_COLLABORATION.md` - Collaboration features guide

### Scripts
- `test-collaboration-complete.sh` - Full system test
- `deploy-aws.sh` - AWS deployment
- `validate-setup.sh` - Setup validation

### Configuration Files
- `docker-compose.production.yml` - Production setup
- `docker-compose.dev.yml` - Development setup
- `nginx/opendaw.conf` - Nginx configuration
- `prisma/schema.prisma` - Database schema

## 🤝 Support

### Getting Help
1. Check the [Troubleshooting](#troubleshooting) section
2. Review container logs
3. Test individual services
4. Check the GitHub issues
5. Contact the development team

### Contributing
1. Fork the repository
2. Create a feature branch
3. Test with Docker setup
4. Submit a pull request

---

## 🎉 Success!

If you can access all services and register users successfully, your OpenDAW collaboration system is ready for use!

**Next Steps:**
1. Invite team members
2. Create your first collaborative project
3. Start making music together!

**Have fun collaborating! 🎵**
