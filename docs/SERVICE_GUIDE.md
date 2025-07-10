# 🎵 SynxSphere - Complete Service Guide

## 🚀 Ready to Start? Choose Your Path:

### 🎯 For Beginners (Interactive Setup)
```bash
./start.sh
```
*This script will guide you through setup and startup step-by-step*

### ⚡ For Quick Launch (One Command)
```bash
./launch.sh
```
*Just start everything and go!*

### 🔧 For Developers (Manual Control)
```bash
# Start individual services
npm run opendaw:start
npm run dev

# Or use service manager
npm run services:start
```

---

## 📋 All Available Scripts

### Quick Launch Scripts
- `./start.sh` - Interactive setup and startup wizard
- `./launch.sh` - One-command launch (both services)
- `./troubleshoot.sh` - Diagnose and fix common issues

### Service Management (npm scripts)
- `npm run services:start` - Start all services
- `npm run services:stop` - Stop all services  
- `npm run services:status` - Check service status
- `npm run services:restart` - Restart all services

### Individual Service Control
- `npm run opendaw:start` - Start OpenDAW server
- `npm run opendaw:stop` - Stop OpenDAW server
- `npm run opendaw:status` - Check OpenDAW status
- `npm run dev` - Start React/Next.js app (manual stop with Ctrl+C)

### Development & Setup
- `npm run dev:full` - Start both OpenDAW and React app
- `npm run db:setup` - Initialize database
- `npm install` - Install dependencies

---

## 🌐 Access Points

Once services are running, you can access:

| Service | URL | Description |
|---------|-----|-------------|
| **🎵 SynxSphere App** | http://localhost:3000 | Main application |
| **🎧 Studio Integration** | http://localhost:3000/studio/opendaw | OpenDAW in iframe |
| **🎹 Direct OpenDAW** | https://localhost:8080 | OpenDAW standalone |

---

## 🔍 Service Status

### Check What's Running
```bash
npm run services:status
```

### Expected Output
```
=== SynxSphere Service Manager ===

Service Status:

✓ React/Next.js App is running and accessible
✓ Process running on port 3000 (PID: 12345)

✓ openDAW Server is running and accessible  
✓ Process running on port 8080 (PID: 67890)

Integration URLs:
  React App: http://localhost:3000
  Studio Page: http://localhost:3000/studio
  openDAW Integration: http://localhost:3000/studio/opendaw
  Direct openDAW: https://localhost:8080
```

---

## 🛠️ Troubleshooting

### Quick Diagnosis
```bash
./troubleshoot.sh
```

### Common Issues & Solutions

#### Services Won't Start
```bash
# Check prerequisites
./troubleshoot.sh

# Full reset
npm run services:stop
./start.sh
```

#### Port Already in Use
```bash
# Check what's using ports
lsof -i :3000
lsof -i :8080

# Stop all services
npm run services:stop
```

#### Missing Dependencies
```bash
# Reinstall everything
npm install
cd openDAW/studio && npm install && cd ../..
```

#### SSL Certificate Issues
```bash
# Regenerate certificates
cd openDAW && bash cert.sh && cd ..
```

---

## 📚 Documentation

- **[Quick Start Guide](docs/QUICK_START_GUIDE.md)** - Step-by-step setup
- **[Detailed Services Guide](docs/SERVICES_SETUP_GUIDE.md)** - Complete setup documentation
- **[OpenDAW Integration](docs/OPENDAW_IFRAME_INTEGRATION.md)** - Technical integration details
- **[Main README](README.md)** - Project overview and features

---

## 🎯 Development Workflow

### Recommended Setup
1. **Start Services**: `./launch.sh`
2. **Open App**: http://localhost:3000
3. **Code Changes**: Auto-reload in React app
4. **Test Integration**: Visit http://localhost:3000/studio/opendaw

### Multiple Terminals (Advanced)
```bash
# Terminal 1: OpenDAW
npm run opendaw:start

# Terminal 2: React App  
npm run dev

# Terminal 3: Status Monitoring
watch -n 5 'npm run services:status'
```

---

## 🎵 Ready to Create Music?

1. **Start services**: `./start.sh` or `./launch.sh`
2. **Open browser**: http://localhost:3000
3. **Go to Studio**: Click "Studio" → "Launch OpenDAW"
4. **Start creating**! 🎶

---

*Need help? Run `./troubleshoot.sh` or check the documentation links above.*
