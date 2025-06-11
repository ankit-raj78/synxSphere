#!/bin/bash

# Test Audio Mixing Implementation Script
# This script helps test the complete audio mixing functionality

echo "🎵 Testing SyncSphere Audio Mixing Implementation"
echo "=================================================="

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Test 1: Check if Next.js is running
echo -e "\n${YELLOW}1. Checking Next.js Application...${NC}"
if curl -s http://localhost:3005 > /dev/null; then
    echo -e "${GREEN}✓ Next.js application is running on port 3005${NC}"
else
    echo -e "${RED}✗ Next.js application is not running${NC}"
    echo "Please run: npm run dev"
    exit 1
fi

# Test 2: Check if microservices are running
echo -e "\n${YELLOW}2. Checking Microservices...${NC}"

# User Service
if curl -s http://localhost:3001/health > /dev/null; then
    echo -e "${GREEN}✓ User Service is running on port 3001${NC}"
else
    echo -e "${RED}✗ User Service is not running${NC}"
fi

# Audio Service
if curl -s http://localhost:3002/health > /dev/null; then
    echo -e "${GREEN}✓ Audio Service is running on port 3002${NC}"
else
    echo -e "${RED}✗ Audio Service is not running${NC}"
fi

# Session Service
if curl -s http://localhost:3003/health > /dev/null; then
    echo -e "${GREEN}✓ Session Service is running on port 3003${NC}"
else
    echo -e "${RED}✗ Session Service is not running${NC}"
fi

# Test 3: Check if audio files exist
echo -e "\n${YELLOW}3. Checking Audio Test Files...${NC}"
AUDIO_FILES=("Arctic Monkeys - Do I Wanna Know？ (Official Video)_bass.wav" 
             "Arctic Monkeys - Do I Wanna Know？ (Official Video)_drums.wav" 
             "Arctic Monkeys - Do I Wanna Know？ (Official Video)_vocals.wav" 
             "Arctic Monkeys - Do I Wanna Know？ (Official Video)_other.wav")

for file in "${AUDIO_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓ Found: $file${NC}"
    else
        echo -e "${RED}✗ Missing: $file${NC}"
    fi
done

# Test 4: Check API endpoints
echo -e "\n${YELLOW}4. Testing API Endpoints...${NC}"

# Test room API
echo "Testing room API..."
ROOM_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3005/api/rooms/test-room-123)
if [ "$ROOM_RESPONSE" = "401" ]; then
    echo -e "${GREEN}✓ Room API is responding (authentication required)${NC}"
else
    echo -e "${YELLOW}⚠ Room API response: $ROOM_RESPONSE${NC}"
fi

# Test tracks API
echo "Testing tracks API..."
TRACKS_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3005/api/rooms/test-room-123/tracks)
if [ "$TRACKS_RESPONSE" = "401" ]; then
    echo -e "${GREEN}✓ Tracks API is responding (authentication required)${NC}"
else
    echo -e "${YELLOW}⚠ Tracks API response: $TRACKS_RESPONSE${NC}"
fi

# Test 5: Component structure check
echo -e "\n${YELLOW}5. Checking Component Structure...${NC}"
COMPONENTS=("components/MusicRoomDashboard.tsx" 
            "components/AudioMixer.tsx" 
            "components/FileUploadModal.tsx")

for component in "${COMPONENTS[@]}"; do
    if [ -f "$component" ]; then
        echo -e "${GREEN}✓ $component exists${NC}"
    else
        echo -e "${RED}✗ $component is missing${NC}"
    fi
done

echo -e "\n${YELLOW}🎯 Testing Instructions:${NC}"
echo "1. Login at: http://localhost:3005/auth/login (use any test credentials)"
echo "2. Navigate to: http://localhost:3005/room/test-room-123"
echo "3. Click on 'Audio Mixer' tab to test mixing interface"
echo "4. Test features:"
echo "   - Track volume controls"
echo "   - Mute/Solo buttons"  
echo "   - Effects controls"
echo "   - File upload modal"
echo "   - Real-time collaboration indicators"

echo -e "\n${GREEN}🚀 Ready to test audio mixing implementation!${NC}"
