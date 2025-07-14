# 🎵 OpenDAW Collaboration - Quick Setup Guide

## 🚀 One-Command Setup

```bash
# Download and run the setup script
curl -sSL https://raw.githubusercontent.com/your-username/synxSphere/main/setup-opendaw-collaboration.sh | bash
```

**OR** manually:

```bash
# 1. Clone this repository
git clone https://github.com/your-username/synxSphere.git
cd synxSphere

# 2. Run the setup script
chmod +x setup-opendaw-collaboration.sh
./setup-opendaw-collaboration.sh

# 3. Validate the setup
chmod +x validate-setup.sh
./validate-setup.sh
```

## 📋 Prerequisites

- **Node.js** 18+ ([Download](https://nodejs.org))
- **PostgreSQL** 12+ ([Download](https://postgresql.org))
- **Git** ([Download](https://git-scm.com))

### macOS Quick Prerequisites:
```bash
# Install via Homebrew
brew install node postgresql git
brew services start postgresql
```

### Ubuntu/Debian Quick Prerequisites:
```bash
# Install via apt
sudo apt update
sudo apt install nodejs npm postgresql postgresql-contrib git
sudo systemctl start postgresql
```

## ⚡ Quick Start (After Setup)

```bash
# Start all services
npm start

# Test collaboration
npm run test:collab

# Stop all services  
npm stop
```

## 🔗 Access URLs

- **🌐 SynxSphere Dashboard:** http://localhost:3000
- **🎵 OpenDAW Studio:** https://localhost:8080
- **📡 Collaboration API:** http://localhost:3003/api/health

## 🧪 Test Collaboration

1. **Open two browser tabs with:**
   - User 1: `https://localhost:8080/?collaborative=true&projectId=test&userId=user1&userName=User1`
   - User 2: `https://localhost:8080/?collaborative=true&projectId=test&userId=user2&userName=User2`

2. **Create audio tracks** in one tab and watch them appear in real-time in the other!

## ✨ Key Features

- ✅ **Real-time collaboration** - Multiple users editing simultaneously
- ✅ **Auto-save** - Projects save automatically every 30 seconds
- ✅ **Auto-load** - Projects load when users join
- ✅ **Native OpenDAW integration** - Uses OpenDAW's serialization
- ✅ **Project persistence** - PostgreSQL database storage
- ✅ **User management** - Session tracking and ownership
- ✅ **WebSocket sync** - Instant updates across users

## 🎯 What Gets Installed

```
synxSphere/
├── 🌐 SynxSphere Dashboard (Next.js)
├── 🎵 OpenDAW Studio (Vite + TypeScript)
├── 📡 Collaboration Server (Node.js + WebSocket)
├── 🗄️ PostgreSQL Database (Projects + Sessions)
├── 🔧 Setup & Management Scripts
└── 🧪 Test & Validation Tools
```

## 🔧 Management Commands

```bash
# Service Management
npm start              # Start all services
npm stop               # Stop all services
npm restart            # Restart all services

# Testing
npm run test:collab    # Test collaboration features
npm run validate       # Validate setup

# Database
npm run db:reset       # Reset database
npm run db:backup      # Backup database
npm run db:restore     # Restore database

# Development
npm run dev:collab     # Start collaboration server only
npm run dev:synx       # Start SynxSphere only
npm run dev:opendaw    # Start OpenDAW only
```

## 🐛 Troubleshooting

### Services won't start
```bash
# Check if ports are available
lsof -i :3000 -i :3003 -i :3005 -i :8080

# Kill conflicting processes
npm run kill-ports
```

### Database connection issues
```bash
# Reset database
npm run db:reset

# Check PostgreSQL status
brew services list | grep postgresql  # macOS
systemctl status postgresql           # Linux
```

### OpenDAW won't load
```bash
# Rebuild OpenDAW
cd openDAW/studio
npm run build
cd ../..
```

### Collaboration not working
```bash
# Check all services
npm run validate

# Check logs
tail -f logs/collaboration.log
tail -f logs/synxsphere.log
```

## 📖 Advanced Configuration

### Custom Database Settings
```bash
# Edit .env file
nano opendaw-collab-mvp/.env

# Available settings:
DATABASE_URL=postgresql://user:pass@host:port/db
WS_PORT=3005
HTTP_PORT=3003
LOG_LEVEL=debug
```

### Custom OpenDAW Build
```bash
# Development build with collaboration
cd openDAW/studio
npm run dev:collab

# Production build
npm run build:prod
```

## 🎵 Start Collaborating!

That's it! You now have a fully functional collaborative digital audio workstation.

**Happy music making! 🎶**

---

### 📞 Need Help?

- 📚 **Documentation:** Check `SETUP.md` for detailed guides
- 🐛 **Issues:** Report bugs in GitHub Issues  
- 💬 **Discussions:** Join our Discord/Slack community
- 📧 **Contact:** support@synxsphere.com
