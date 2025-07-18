# 🎵 OpenDAW Collaboration System - Complete Docker Package

## 📦 What This Is

A complete, containerized collaborative digital audio workstation that allows multiple users to create music together in real-time. Everything runs in Docker containers for easy team deployment.

## 🚀 Quick Start for Teams

### Prerequisites
- Docker Desktop installed
- Git installed  
- 8GB+ RAM available

### One-Command Setup
```bash
git clone https://github.com/your-username/synxSphere.git
cd synxSphere
./deploy-docker.sh dev up
```

### Access Your System
- **🌐 Dashboard:** http://localhost:3000
- **🎵 OpenDAW:** https://localhost:8080
- **📡 API:** http://localhost:3003/api/health

### Test Collaboration
Open these URLs in different browser tabs:
- **User 1:** https://localhost:8080/?collaborative=true&projectId=test&userId=user1&userName=Alice
- **User 2:** https://localhost:8080/?collaborative=true&projectId=test&userId=user2&userName=Bob

## ✨ Features

### 🎵 Collaborative Music Creation
- **Real-time multi-user editing** - Multiple users can edit the same project simultaneously
- **Live audio collaboration** - See changes instantly across all connected users
- **Project persistence** - Projects auto-save and reload across sessions
- **User management** - Track who's online and editing what

### 🛠️ Technical Features
- **OpenDAW Integration** - Full digital audio workstation in your browser
- **WebSocket Real-time Sync** - Instant updates using WebSockets
- **PostgreSQL Persistence** - Reliable project storage
- **Docker Containerization** - Easy deployment and scaling
- **Development & Production Ready** - Complete environments for both

## 📋 Team Commands

```bash
# Development Environment
./deploy-docker.sh dev up       # Start development
./deploy-docker.sh dev down     # Stop development
./deploy-docker.sh dev logs     # View logs
./deploy-docker.sh dev restart  # Restart services

# Production Environment  
./deploy-docker.sh prod up      # Start production
./deploy-docker.sh prod down    # Stop production
./deploy-docker.sh prod build   # Rebuild images
```

## 🏗️ Architecture

### Services
- **OpenDAW Studio** - Digital audio workstation (Port 8080)
- **SynxSphere Dashboard** - Project management interface (Port 3000)
- **Collaboration Server** - Real-time sync backend (Ports 3003, 3005)
- **PostgreSQL** - Project database (Port 5433)
- **Redis** - Session cache (Port 6379)
- **Adminer** - Database admin interface (Port 8081)

### Data Flow
```
User 1 (OpenDAW) ←→ WebSocket Server ←→ User 2 (OpenDAW)
                          ↓
                    PostgreSQL Database
                    (Project Storage)
```

## 📚 Documentation

- **`README-DOCKER.md`** - Complete Docker setup guide for teams
- **`INSTALLATION-GUIDE.md`** - Comprehensive installation and features guide  
- **`README-SETUP.md`** - Quick setup guide for local development
- **`deploy-docker.sh`** - Automated deployment script

## 🐳 Docker Files

- **`docker-compose.dev.yml`** - Development environment with hot reload
- **`docker-compose.production.yml`** - Production environment optimized
- **`Dockerfile.collaboration`** - Collaboration server container
- **`Dockerfile.synxsphere`** - SynxSphere dashboard container
- **`Dockerfile.opendaw`** - OpenDAW studio container

## 🔧 Development Workflow

### For Team Members
1. **Clone repository** - `git clone ...`
2. **Start environment** - `./deploy-docker.sh dev up`
3. **Make changes** - Edit source code
4. **Rebuild if needed** - `./deploy-docker.sh dev build`
5. **Test collaboration** - Use provided test URLs

### For Developers
1. **Hot reload enabled** - Changes reflect immediately in development
2. **Debug ports exposed** - Connect debuggers to ports 9229-9231
3. **Source mounted** - Code changes don't require rebuilds
4. **Logs accessible** - Real-time log viewing with `./deploy-docker.sh dev logs`

## 🌐 Deployment Options

### Team Development
- Use `./deploy-docker.sh dev up`
- Hot reload and debugging enabled
- Perfect for collaborative development

### Production Deployment
- Use `./deploy-docker.sh prod up`
- Optimized builds and SSL
- Ready for live deployment

### Cloud Deployment
- All containers can be deployed to AWS, Azure, GCP
- Use `docker-compose.production.yml` as base
- Configure environment variables for cloud

## 🧪 Testing

### Automated Testing
```bash
# Test API endpoints
curl http://localhost:3003/api/health

# Test WebSocket
# (WebSocket testing script provided)

# Test database
docker-compose -f docker-compose.dev.yml exec postgres psql -U opendaw -d opendaw_collab -c "SELECT 1;"
```

### Manual Testing
1. Start the development environment
2. Open two browser tabs with different user URLs
3. Create audio tracks in one tab
4. Verify they appear in real-time in the other tab
5. Test auto-save by refreshing and rejoining

## 🐛 Troubleshooting

### Common Issues
```bash
# Port conflicts
lsof -i :3000 -i :3003 -i :3005 -i :8080

# Clean restart
./deploy-docker.sh dev down
docker system prune -f
./deploy-docker.sh dev up

# Check logs
./deploy-docker.sh dev logs
```

### Performance
- **Minimum:** 4GB RAM, 2 CPU cores
- **Recommended:** 8GB RAM, 4 CPU cores
- **Ports needed:** 3000, 3003, 3005, 8080, 8081

## 📊 Monitoring

### Service Health
```bash
# Check all services
docker-compose -f docker-compose.dev.yml ps

# Check specific service
docker-compose -f docker-compose.dev.yml logs -f collaboration
```

### Application Health
```bash
# API health check
curl http://localhost:3003/api/health

# Database connectivity
docker-compose -f docker-compose.dev.yml exec postgres pg_isready -U opendaw
```

## 🎯 Success Criteria

After running `./deploy-docker.sh dev up`, you should see:

✅ **All services running** - `docker-compose ps` shows all services as "Up"  
✅ **API responding** - `curl http://localhost:3003/api/health` returns {"status":"ok"}  
✅ **Dashboard accessible** - http://localhost:3000 loads  
✅ **OpenDAW accessible** - https://localhost:8080 loads  
✅ **Database working** - Can connect via http://localhost:8081  
✅ **Collaboration working** - Multiple users can edit the same project  

## 🎉 Ready for Your Team!

This package provides everything your team needs to:

🎵 **Create music collaboratively** in real-time  
🚀 **Deploy easily** with one command  
🔧 **Develop efficiently** with hot reload  
📊 **Monitor effectively** with logs and health checks  
🌐 **Scale globally** with cloud deployment  

### Next Steps
1. **Share this repository** with your team
2. **Run the setup** on each team member's machine
3. **Start collaborating** on music projects
4. **Deploy to production** when ready

**Happy collaborative music making! 🎶**

---

### 📞 Support
- **GitHub Issues:** Report bugs and feature requests
- **Documentation:** Complete guides in the `docs/` folder
- **Docker Help:** Check Docker Desktop documentation
- **Team Chat:** Set up your preferred team communication tool

### 🤝 Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with Docker
5. Submit a pull request

**Built with ❤️ for collaborative music creation**
