# SyncSphere TypeScript Development Setup

## 🚀 Quick Start Guide

### 1. Install Dependencies
```bash
# Install Node.js dependencies for all services
cd services/shared && npm install
cd ../user-service && npm install  
cd ../audio-service && npm install
cd ../session-service && npm install
```

### 2. Build All Services
```bash
# From project root
./build-all.sh
```

### 3. Start Development Environment
```bash
# Option A: With databases (recommended)
docker-compose -f docker-compose.dev.yml up -d
./start-dev.sh

# Option B: Services only (for testing)
./start-dev.sh
```

### 4. Verify Setup
```bash
# Run health check
./health-check.sh

# Run test suite
./test-all.sh
```

## 📡 API Testing

### User Service (3001)
```bash
# Register user
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"password123"}'

# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### Audio Service (3002)
```bash
# Upload audio file (requires authentication)
curl -X POST http://localhost:3002/api/upload/single \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "audio=@path/to/audio.mp3"
```

### Session Service (3003)
```bash
# Create room (requires authentication)
curl -X POST http://localhost:3003/api/rooms \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"My Room","description":"Test room"}'
```

## 🔧 Development Commands

```bash
# Build specific service
cd services/user-service && npm run build

# Start service in development mode  
cd services/user-service && npm run dev

# Run tests
cd services/user-service && npm test

# Clean build
cd services/user-service && npm run clean
```

## 📁 Important Files

- `services/shared/types/index.ts` - All TypeScript type definitions
- `services/shared/config/database.ts` - Database connection manager
- `services/shared/middleware/auth.ts` - Authentication middleware
- `TYPESCRIPT_CONVERSION_COMPLETE.md` - Full documentation

## 🛠️ Troubleshooting

### Build Issues
```bash
# Clean and rebuild
cd services/user-service
npm run clean
npm install
npm run build
```

### Port Conflicts
```bash
# Check what's using ports
lsof -i :3001
lsof -i :3002  
lsof -i :3003

# Kill processes if needed
pkill -f "ts-node-dev"
```

### Database Issues
```bash
# Restart databases
docker-compose -f docker-compose.dev.yml down
docker-compose -f docker-compose.dev.yml up -d

# Check database logs
docker logs syncsphere-postgres
docker logs syncsphere-mongodb
docker logs syncsphere-redis
```

## ✅ Verification Checklist

- [ ] All services build without errors
- [ ] Services start on correct ports (3001, 3002, 3003)
- [ ] Authentication endpoints respond
- [ ] File upload functionality works
- [ ] Database connections established
- [ ] WebSocket connections work for sessions

---

**Status**: ✅ TypeScript conversion complete and ready for development!
