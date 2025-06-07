#!/bin/bash

# Build all TypeScript microservices
echo "Building all SyncSphere TypeScript services..."

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Note: Shared types are already compiled - skipping build
echo -e "${GREEN}✅ Shared types already compiled${NC}"

# Build user service
echo "Building user service..."
cd services/user-service
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ User service build failed${NC}"
    exit 1
fi
echo -e "${GREEN}✅ User service built successfully${NC}"

# Build audio service
echo "Building audio service..."
cd ../audio-service
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Audio service build failed${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Audio service built successfully${NC}"

# Build session service
echo "Building session service..."
cd ../session-service
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Session service build failed${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Session service built successfully${NC}"

echo -e "${GREEN}🎉 All services built successfully!${NC}"
echo ""
echo -e "${YELLOW}📝 Note: Recommendation service excluded from build${NC}"
echo ""
echo "Services ready to run:"
echo "- User Service: cd services/user-service && npm start"
echo "- Audio Service: cd services/audio-service && npm start"
echo "- Session Service: cd services/session-service && npm start"
