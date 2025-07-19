# 🐳 OpenDAW Collaboration - Docker Setup for Teams

## 🚀 Quick Start for Team Members

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed
- [Git](https://git-scm.com/) installed
- 8GB+ RAM available
- Ports 3000, 3003, 3005, 8080, 8081 available

### One-Command Setup

```bash
# 1. Clone the repository
git clone https://github.com/your-username/synxSphere.git
cd synxSphere

# 2. Start development environment
./deploy-docker.sh dev up

# 3. Start collaborating!
# Visit: http://localhost:3000 (Dashboard)
# Visit: https://localhost:8080 (OpenDAW Studio)
```

## 🎯 What You Get

### 🌐 Access URLs
- **📊 SynxSphere Dashboard:** http://localhost:3000
- **🎵 OpenDAW Studio:** https://localhost:8080  
- **📡 API Health Check:** http://localhost:3003/api/health
- **🗄️ Database Admin:** http://localhost:8081

### 🧪 Test Collaboration
Open these URLs in different browser tabs to test multi-user collaboration:
- **User 1:** https://localhost:8080/?collaborative=true&projectId=test&userId=user1&userName=Alice
- **User 2:** https://localhost:8080/?collaborative=true&projectId=test&userId=user2&userName=Bob

## 📋 Team Commands

### Basic Operations
```bash
# Start development environment
./deploy-docker.sh dev up

# Stop all services  
./deploy-docker.sh dev down

# View logs
./deploy-docker.sh dev logs

# Restart services
./deploy-docker.sh dev restart

# Rebuild containers (after code changes)
./deploy-docker.sh dev build
```

### Production Deployment
```bash
# Start production environment
./deploy-docker.sh prod up

# Stop production
./deploy-docker.sh prod down
```

## 🔧 Development Workflow

### Making Code Changes

1. **Make your changes** to the source code
2. **Rebuild the affected service:**
   ```bash
   # Rebuild specific service
   docker-compose -f docker-compose.dev.yml build collaboration
   docker-compose -f docker-compose.dev.yml up -d collaboration
   
   # Or rebuild everything
   ./deploy-docker.sh dev build
   ./deploy-docker.sh dev up
   ```

### Debugging Services

```bash
# Check service status
docker-compose -f docker-compose.dev.yml ps

# View logs for specific service
docker-compose -f docker-compose.dev.yml logs -f collaboration
docker-compose -f docker-compose.dev.yml logs -f synxsphere
docker-compose -f docker-compose.dev.yml logs -f opendaw

# Execute shell in container
docker-compose -f docker-compose.dev.yml exec collaboration sh
docker-compose -f docker-compose.dev.yml exec postgres psql -U opendaw -d opendaw_collab
```

### Database Operations

```bash
# Connect to database
docker-compose -f docker-compose.dev.yml exec postgres psql -U opendaw -d opendaw_collab

# Reset database
docker-compose -f docker-compose.dev.yml down
docker volume rm synxsphere_postgres_dev_data
./deploy-docker.sh dev up

# View database via web interface
# Visit: http://localhost:8081
# Server: postgres
# Username: opendaw
# Password: collaboration
# Database: opendaw_collab
```

## 🏗️ Architecture Overview

### 🐳 Docker Services

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   OpenDAW       │    │   SynxSphere    │    │  Collaboration  │
│   Studio        │    │   Dashboard     │    │    Server       │
│                 │    │                 │    │                 │
│   Port: 8080    │    │   Port: 3000    │    │   Port: 3003    │
│   (Nginx)       │    │   (Next.js)     │    │   Port: 3005    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
         ┌─────────────────┐    ┌─────────────────┐
         │   PostgreSQL    │    │     Redis       │
         │   Database      │    │     Cache       │
         │                 │    │                 │
         │   Port: 5433    │    │   Port: 6379    │
         └─────────────────┘    └─────────────────┘
```

### 📁 Directory Structure
```
synxSphere/
├── 🐳 Dockerfile.collaboration     # Collaboration server image
├── 🐳 Dockerfile.synxsphere        # SynxSphere dashboard image  
├── 🐳 Dockerfile.opendaw           # OpenDAW studio image
├── 🐳 docker-compose.dev.yml       # Development environment
├── 🐳 docker-compose.production.yml # Production environment
├── 🚀 deploy-docker.sh             # Deployment script
├── 🌐 nginx/                       # OpenDAW web server config
├── 🎵 openDAW/                     # OpenDAW source code
├── 📡 opendaw-collab-mvp/          # Collaboration server code
└── 📊 SynxSphere components        # Dashboard components
```

## 🎵 Collaboration Features

### ✅ Real-Time Multi-User Editing
- Multiple users can edit the same project simultaneously
- Live updates across all connected users
- User presence indicators
- Conflict resolution

### ✅ Project Persistence
- Auto-save every 30 seconds
- Projects stored in PostgreSQL database
- Auto-load when users rejoin projects
- Manual save through OpenDAW UI

### ✅ User Management
- Session tracking and authentication
- Project ownership and permissions
- Join/leave notifications
- User activity monitoring

## 🐛 Troubleshooting

### Services Won't Start
```bash
# Check Docker status
docker --version
docker-compose --version
docker info

# Check port conflicts
lsof -i :3000 -i :3003 -i :3005 -i :8080 -i :8081

# Clean restart
./deploy-docker.sh dev down
docker system prune -f
./deploy-docker.sh dev up
```

### Collaboration Not Working
```bash
# Check API health
curl http://localhost:3003/api/health

# Check WebSocket
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" -H "Sec-WebSocket-Key: test" -H "Sec-WebSocket-Version: 13" http://localhost:3005

# View collaboration logs
docker-compose -f docker-compose.dev.yml logs -f collaboration
```

### Database Issues
```bash
# Reset database completely
./deploy-docker.sh dev down
docker volume rm synxsphere_postgres_dev_data synxsphere_redis_dev_data
./deploy-docker.sh dev up

# Check database connectivity
docker-compose -f docker-compose.dev.yml exec postgres pg_isready -U opendaw
```

### Performance Issues
```bash
# Check container resource usage
docker stats

# Increase Docker resources:
# Docker Desktop → Settings → Resources → Advanced
# Recommended: 4+ CPUs, 8+ GB RAM
```

## 📊 Monitoring & Logs

### View All Logs
```bash
./deploy-docker.sh dev logs
```

### Service-Specific Logs
```bash
# Collaboration server
docker-compose -f docker-compose.dev.yml logs -f collaboration

# SynxSphere dashboard  
docker-compose -f docker-compose.dev.yml logs -f synxsphere

# OpenDAW studio
docker-compose -f docker-compose.dev.yml logs -f opendaw

# Database
docker-compose -f docker-compose.dev.yml logs -f postgres
```

### Health Checks
```bash
# All services
docker-compose -f docker-compose.dev.yml ps

# API endpoints
curl http://localhost:3003/api/health
curl http://localhost:3000/api/health
```

## 🚀 Deployment Options

### Development (Team Collaboration)
```bash
./deploy-docker.sh dev up
```
- Hot reload enabled
- Debug ports exposed
- Source code mounted as volumes
- Development tools included

### Production (Live Deployment)
```bash
./deploy-docker.sh prod up
```
- Optimized builds
- SSL/HTTPS enabled
- Production-ready configuration
- Health checks and auto-restart

### Custom Environment
```bash
# Create custom environment file
cp .env.dev .env.custom

# Edit configuration
nano .env.custom

# Use custom file
docker-compose -f docker-compose.dev.yml --env-file .env.custom up -d
```

## 🎉 Success!

Your team now has a fully containerized OpenDAW collaboration environment!

### 🎯 Next Steps for Team Members
1. **Test the collaboration:** Open the test URLs in different browsers
2. **Create music projects:** Use OpenDAW's full feature set
3. **Collaborate in real-time:** See changes instantly across users
4. **Share projects:** Projects persist and can be resumed later

### 📞 Team Support
- **Documentation:** Check other README files in the repository
- **Issues:** Report problems in GitHub Issues
- **Docker Help:** Check Docker Desktop documentation
- **Collaboration Features:** See `INSTALLATION-GUIDE.md`

**Happy collaborative music making! 🎵**
