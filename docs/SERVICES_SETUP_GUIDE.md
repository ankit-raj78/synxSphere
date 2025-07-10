# 🚀 SyncSphere + OpenDAW Services - Complete Setup Guide

## 📋 Prerequisites

Before starting, ensure you have:
- **Node.js** (v18 or higher)
- **npm** (comes with Node.js)
- **Git** (for repository management)
- **PostgreSQL** (for SyncSphere database)
- **mkcert** (for SSL certificates) - `brew install mkcert`

## 🗂️ Project Structure Overview

```
/Users/ankitraj2/Documents/GitHub/synxSphere/
├── 🎵 SyncSphere (React/Next.js App)     → http://localhost:3000
├── 🎧 OpenDAW (Audio Workstation)       → https://localhost:8080
└── 🗄️ PostgreSQL Database               → localhost:5432
```

---

## 🔧 Step 1: Initial Setup (One-time)

### 1.1 Navigate to Project Directory
```bash
cd /Users/ankitraj2/Documents/GitHub/synxSphere
```

### 1.2 Install Dependencies
```bash
# Install main SyncSphere dependencies
npm install

# Install OpenDAW dependencies
cd openDAW/studio
npm install
cd ../..
```

### 1.3 Setup SSL Certificates for OpenDAW
```bash
# Generate SSL certificates
cd openDAW
bash cert.sh
cd ..
```

### 1.4 Setup Database (if not already done)
```bash
# Initialize PostgreSQL database
npm run db:setup
```

---

## 🚀 Step 2: Starting Services

### Option A: Start All Services Automatically
```bash
# Start both OpenDAW and SyncSphere together
npm run dev:full
```

### Option B: Start Services Manually (Recommended for Development)

#### 2.1 Start OpenDAW Server
```bash
# Terminal 1: Start OpenDAW
npm run opendaw:start

# Verify it's running
npm run opendaw:status
```
**Expected Output:**
```
✅ OpenDAW server is running (PID: XXXXX)
✅ Server is responding at https://localhost:8080
```

#### 2.2 Start SyncSphere (React App)
```bash
# Terminal 2: Start SyncSphere
npm run dev
```
**Expected Output:**
```
▲ Next.js 14.2.30
- Local:        http://localhost:3000
✓ Ready in XXXXms
```

---

## 🌐 Step 3: Access the Services

### 3.1 SyncSphere Main App
- **URL**: http://localhost:3000
- **Login**: Use your existing credentials or register
- **Features**: Dashboard, Rooms, Audio Files, Studio Integration

### 3.2 OpenDAW Studio (Direct Access)
- **URL**: https://localhost:8080
- **Note**: Direct access to OpenDAW (bypass React)
- **Features**: Full DAW capabilities, audio production

### 3.3 Integrated Studio (Recommended)
- **URL**: http://localhost:3000/studio
- **Features**: 
  - Choose between iframe integration or direct access
  - Integrated with SyncSphere authentication
  - Project management tied to user account

---

## 🔍 Step 4: Verify Everything is Working

### 4.1 Check Service Status
```bash
# Check all services
npm run services:status
```

### 4.2 Manual Verification

#### SyncSphere Health Check:
```bash
curl -I http://localhost:3000
# Expected: HTTP/1.1 200 OK
```

#### OpenDAW Health Check:
```bash
curl -k -I https://localhost:8080
# Expected: HTTP/1.1 200 OK
```

### 4.3 Test Integration
1. **Open Browser**: Navigate to http://localhost:3000
2. **Login/Register**: Use the authentication system
3. **Access Studio**: Go to `/studio` or click Studio in navigation
4. **Choose Integration**: Select "OpenDAW Studio" for iframe integration
5. **Verify Loading**: OpenDAW should load within the iframe

---

## 🛠️ Step 5: Development Workflow

### 5.1 Daily Development Start
```bash
# Quick start for development
cd /Users/ankitraj2/Documents/GitHub/synxSphere

# Start OpenDAW (background)
npm run opendaw:start

# Start SyncSphere (foreground)
npm run dev
```

### 5.2 Making Changes

#### To SyncSphere (React/Next.js):
- Changes are automatically detected and hot-reloaded
- No restart required

#### To OpenDAW:
```bash
# Restart OpenDAW server
npm run opendaw:restart
```

### 5.3 Stopping Services
```bash
# Stop OpenDAW
npm run opendaw:stop

# Stop SyncSphere
# Press Ctrl+C in the terminal running npm run dev
```

---

## 📊 Service Management Commands

### OpenDAW Management:
```bash
npm run opendaw:start     # Start OpenDAW server
npm run opendaw:stop      # Stop OpenDAW server
npm run opendaw:restart   # Restart OpenDAW server
npm run opendaw:status    # Check OpenDAW status
npm run opendaw:setup     # Setup OpenDAW environment
```

### SyncSphere Management:
```bash
npm run dev              # Start development server
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run linting
```

### Database Management:
```bash
npm run db:setup         # Initialize database
npm run init-db          # Alternative setup command
```

---

## 🚨 Troubleshooting

### Issue: OpenDAW won't start
**Solution:**
```bash
# Check if port 8080 is in use
lsof -i :8080

# Kill any existing processes
npm run opendaw:stop

# Regenerate SSL certificates
cd openDAW
bash cert.sh
cd ..

# Try starting again
npm run opendaw:start
```

### Issue: SyncSphere won't start
**Solution:**
```bash
# Check if port 3000 is in use
lsof -i :3000

# Clear Next.js cache
rm -rf .next

# Reinstall dependencies if needed
npm install

# Try starting again
npm run dev
```

### Issue: Database connection errors
**Solution:**
```bash
# Check PostgreSQL status
brew services list | grep postgresql

# Start PostgreSQL if not running
brew services start postgresql

# Reinitialize database
npm run db:setup
```

### Issue: SSL certificate errors
**Solution:**
```bash
# Install mkcert if not installed
brew install mkcert

# Install root CA
mkcert -install

# Regenerate certificates
cd openDAW
bash cert.sh
cd ..
```

### Issue: Iframe not loading
**Common causes:**
1. **HTTPS vs HTTP**: Ensure OpenDAW is running on HTTPS
2. **Browser blocking**: Check browser console for security errors
3. **CORS issues**: Verify OpenDAW server is accessible directly

---

## 📝 Development Tips

### 1. Use Multiple Terminals
- **Terminal 1**: OpenDAW server (`npm run opendaw:start`)
- **Terminal 2**: SyncSphere dev server (`npm run dev`)
- **Terminal 3**: Database operations, git commands, etc.

### 2. Check Logs
```bash
# OpenDAW logs
tail -f /tmp/opendaw-server.log

# SyncSphere logs are in the terminal running npm run dev
```

### 3. Quick Service Check
```bash
# All services at once
npm run services:status
```

### 4. Port Reference
- **3000**: SyncSphere (React/Next.js)
- **8080**: OpenDAW (Audio Workstation)
- **5432**: PostgreSQL Database

---

## 🎯 Quick Start Summary

For experienced developers, here's the minimal commands to get everything running:

```bash
cd /Users/ankitraj2/Documents/GitHub/synxSphere
npm run opendaw:start && npm run dev
```

Then open http://localhost:3000 in your browser and navigate to `/studio`.

---

## 📞 Support

If you encounter issues:

1. **Check Service Status**: `npm run services:status`
2. **Review Logs**: Check terminal outputs and `/tmp/opendaw-server.log`
3. **Restart Services**: Stop and start services fresh
4. **Check Documentation**: Refer to individual service docs in their directories

**Integration is working correctly when:**
- ✅ SyncSphere loads at http://localhost:3000
- ✅ OpenDAW loads at https://localhost:8080  
- ✅ Iframe integration loads OpenDAW within SyncSphere
- ✅ No console errors in browser

Happy developing! 🎵🚀
