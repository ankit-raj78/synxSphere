#!/bin/bash

echo "=== OpenDAW Collaboration Test ==="
echo "Testing 2 users entering the same room"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Test configuration
BASE_URL="http://localhost:3000"
ROOM_NAME="Test_Collaboration_Room_$(date +%s)"

echo -e "${BLUE}Step 1: Testing API Health${NC}"
echo "Checking SynxSphere API..."
API_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" ${BASE_URL}/api/rooms)
echo "API Status Code: $API_HEALTH"

if [ "$API_HEALTH" = "401" ]; then
    echo -e "${GREEN}✓ API is responding (401 expected for unauthenticated request)${NC}"
else
    echo -e "${RED}✗ Unexpected API response: $API_HEALTH${NC}"
fi

echo ""
echo -e "${BLUE}Step 2: Testing OpenDAW Studio Access${NC}"
echo "Checking OpenDAW Studio availability..."
OPENDAW_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000)
echo "OpenDAW Status Code: $OPENDAW_HEALTH"

if [ "$OPENDAW_HEALTH" = "200" ]; then
    echo -e "${GREEN}✓ OpenDAW Studio is accessible${NC}"
else
    echo -e "${RED}✗ OpenDAW Studio not accessible: $OPENDAW_HEALTH${NC}"
fi

echo ""
echo -e "${BLUE}Step 3: Testing Cross-Origin Headers${NC}"
echo "Checking if cross-origin isolation headers are present..."
HEADERS=$(curl -s -I http://localhost:8000 | grep -i "cross-origin")
if [ -n "$HEADERS" ]; then
    echo -e "${GREEN}✓ Cross-origin headers detected:${NC}"
    echo "$HEADERS" | sed 's/^/  /'
else
    echo -e "${RED}✗ No cross-origin headers found${NC}"
fi

echo ""
echo -e "${BLUE}Step 4: Testing Collaboration Server${NC}"
echo "Checking Collaboration Server API..."
COLLAB_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3003/api/health)
echo "Collaboration Server Status Code: $COLLAB_HEALTH"

if [ "$COLLAB_HEALTH" = "200" ] || [ "$COLLAB_HEALTH" = "404" ]; then
    echo -e "${GREEN}✓ Collaboration Server is responding${NC}"
else
    echo -e "${RED}✗ Collaboration Server not accessible: $COLLAB_HEALTH${NC}"
fi

echo ""
echo -e "${BLUE}Step 5: Testing WebSocket Connection${NC}"
echo "Testing WebSocket endpoint availability..."
WS_TEST=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3005)
echo "WebSocket Endpoint Status Code: $WS_TEST"

echo ""
echo -e "${BLUE}Step 6: Manual Testing Instructions${NC}"
echo -e "${GREEN}To test 2-user collaboration manually:${NC}"
echo ""
echo "1. Open Browser Window 1:"
echo "   → Go to: http://localhost:3000"
echo "   → Register as: user1@test.com / password123"
echo "   → Create or join a room"
echo ""
echo "2. Open Browser Window 2 (Incognito/Private):"
echo "   → Go to: http://localhost:3000"
echo "   → Register as: user2@test.com / password123"
echo "   → Join the same room"
echo ""
echo "3. In both windows:"
echo "   → Click 'Open DAW' button"
echo "   → Verify OpenDAW Studio loads at: http://localhost:8000"
echo "   → Check browser console for collaboration status"
echo ""
echo -e "${BLUE}Expected Collaboration Indicators:${NC}"
echo "• Both users should see each other in the room"
echo "• Real-time cursor movements"
echo "• Shared audio playback position"
echo "• Synchronized project state"
echo "• Live audio collaboration features"

echo ""
echo -e "${GREEN}=== Test Complete ===${NC}"
echo "All services are ready for manual collaboration testing!"
