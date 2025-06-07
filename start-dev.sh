#!/bin/bash

# Development startup script for TypeScript services
echo "Starting SyncSphere TypeScript services in development mode..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}⚠️ Note: This starts services without database connections for development testing${NC}"
echo ""

# Create mock environment file if it doesn't exist
if [ ! -f .env.dev ]; then
    echo "Creating development environment file..."
    cat > .env.dev << 'EOF'
NODE_ENV=development
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=syncsphere_dev
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password
MONGODB_URI=mongodb://localhost:27017/syncsphere_dev
REDIS_URL=redis://localhost:6379
JWT_SECRET=dev-secret-key-change-in-production
USER_SERVICE_PORT=3001
AUDIO_SERVICE_PORT=3002
SESSION_SERVICE_PORT=3003
CORS_ORIGIN=http://localhost:3000
EOF
    echo -e "${GREEN}✅ Created .env.dev file${NC}"
fi

# Start services in the background
echo "Starting User Service on port 3001..."
cd services/user-service && NODE_ENV=development npm run dev &
USER_PID=$!

sleep 2

echo "Starting Audio Service on port 3002..."
cd ../audio-service && NODE_ENV=development npm run dev &
AUDIO_PID=$!

sleep 2

echo "Starting Session Service on port 3003..."
cd ../session-service && NODE_ENV=development npm run dev &
SESSION_PID=$!

echo ""
echo -e "${GREEN}🚀 All services started in development mode!${NC}"
echo ""
echo "Services running:"
echo "- User Service: http://localhost:3001 (PID: $USER_PID)"
echo "- Audio Service: http://localhost:3002 (PID: $AUDIO_PID)"  
echo "- Session Service: http://localhost:3003 (PID: $SESSION_PID)"
echo ""
echo "To stop all services, run: pkill -f 'ts-node-dev'"
echo "To view logs: tail -f services/*/logs/*.log"
