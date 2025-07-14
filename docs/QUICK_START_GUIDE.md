# 🚀 SynxSphere - Quick Start Guide

## 📋 Prerequisites

Before starting, ensure you have:
- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **npm** (comes with Node.js)
- **Git** (for repository management)
- **PostgreSQL** (for SyncSphere database) - [Download](https://www.postgresql.org/download/)
- **mkcert** (for SSL certificates) - `brew install mkcert` (macOS)

## 🗂️ Project Structure Overview

```
/Users/ankitraj2/Documents/GitHub/synxSphere/
├── 🎵 SyncSphere (React/Next.js App)     → http://localhost:3000
├── 🎧 OpenDAW (Audio Workstation)       → https://localhost:8080
└── 🗄️ PostgreSQL Database               → localhost:5432
```

---

## 🔧 One-Time Setup (First Run Only)

### 1. Navigate to Project Directory
```bash
cd /Users/ankitraj2/Documents/GitHub/synxSphere
```

### 2. Install Dependencies
```bash
# Install main SyncSphere dependencies
npm install

# Install OpenDAW dependencies  
cd openDAW/studio
npm install
cd ../..
```

### 3. Setup SSL Certificates for OpenDAW
```bash
# Generate SSL certificates
cd openDAW
bash cert.sh
cd ..
```

### 4. Setup Database (if not already configured)
```bash
# Initialize PostgreSQL database
npm run db:setup
```

---

## 🚀 Starting Services

### Option A: Interactive Startup (Recommended for Beginners)
```bash
# Interactive setup and startup
./start.sh
```

### Option B: One-Command Launch
```bash
# Quick launch (starts both services)
./launch.sh
```

### Option C: Service Manager Commands
```bash
# Start all services at once
npm run services:start

# Check service status
npm run services:status
```

### Option D: Step-by-Step Start (Recommended for Development)

#### Terminal 1: Start OpenDAW Server
```bash
# Start OpenDAW server
npm run opendaw:start

# Check if it's running
npm run opendaw:status
```

#### Terminal 2: Start SyncSphere App
```bash
# Start React/Next.js app
npm run dev
```

---

## 🌐 Access Your Services

### 🎵 SyncSphere Main App
- **URL**: http://localhost:3000
- **Studio Integration**: http://localhost:3000/studio/opendaw
- **Features**: Dashboard, Rooms, Audio Files, Studio Integration

### 🎧 OpenDAW (Direct Access)
- **URL**: https://localhost:8080
- **Note**: Accept the self-signed certificate warning in your browser

---

## 🔍 Service Management Commands

### Status Check
```bash
# Check all services status
npm run services:status

# Check specific service
npm run opendaw:status
```

### Start/Stop Services
```bash
# Start all services
npm run services:start

# Stop all services
npm run services:stop

# Restart all services
npm run services:restart
```

### Individual Service Control
```bash
# OpenDAW Server
npm run opendaw:start
npm run opendaw:stop
npm run opendaw:restart

# React App (use Ctrl+C to stop)
npm run dev
```

---

## 🎯 Quick Integration Test

1. **Open SyncSphere**: http://localhost:3000
2. **Navigate to Studio**: Click "Studio" in the navigation
3. **Access OpenDAW**: Click "Launch OpenDAW" button
4. **Test Integration**: You should see the OpenDAW interface in an iframe

---

## 🛠️ Troubleshooting

### Common Issues

#### OpenDAW Not Starting
```bash
# Check if SSL certificates exist
ls -la openDAW/*.pem

# Regenerate certificates if missing
cd openDAW && bash cert.sh && cd ..

# Try starting again
npm run opendaw:start
```

#### Port Already in Use
```bash
# Check what's using port 3000
lsof -i :3000

# Check what's using port 8080
lsof -i :8080

# Kill process if needed
kill -9 <PID>
```

#### Database Connection Issues
```bash
# Check PostgreSQL is running
brew services list | grep postgresql

# Start PostgreSQL if not running
brew services start postgresql

# Reinitialize database
npm run db:setup
```

### Service Status Indicators

When you run `npm run services:status`, you should see:
- ✅ **Green checkmarks** = Service is running correctly
- ❌ **Red X marks** = Service is not running or not accessible
- **PID numbers** = Process IDs for running services

---

## 📝 Development Workflow

### Recommended Development Setup

1. **Terminal 1**: OpenDAW Server
   ```bash
   npm run opendaw:start
   ```

2. **Terminal 2**: React App (with hot reload)
   ```bash
   npm run dev
   ```

3. **Terminal 3**: Service monitoring
   ```bash
   npm run services:status
   ```

### Making Changes

- **React/Next.js changes**: Auto-reload at http://localhost:3000
- **OpenDAW changes**: May require restart (`npm run opendaw:restart`)
- **Database changes**: Run `npm run db:setup` if schema changes

---

## 📚 Additional Resources

- **Full Setup Guide**: [SERVICES_SETUP_GUIDE.md](./SERVICES_SETUP_GUIDE.md)
- **OpenDAW Integration**: [OPENDAW_IFRAME_INTEGRATION.md](./OPENDAW_IFRAME_INTEGRATION.md)
- **Main Documentation**: [../README.md](../README.md)

---

## 🆘 Need Help?

If you encounter issues:
1. Check the [troubleshooting section](#troubleshooting) above
2. Review the full setup guide in `docs/SERVICES_SETUP_GUIDE.md`
3. Check service logs with `npm run opendaw:logs`
4. Ensure all prerequisites are installed and updated

---

**Ready to create music? 🎵 Start your services and open http://localhost:3000!**
