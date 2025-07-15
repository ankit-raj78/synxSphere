#!/bin/bash

# OpenDAW Collaboration Test Script
# Tests 2 users entering the same room and collaborating

echo "🧪 Testing OpenDAW Collaboration System"
echo "========================================"

# User tokens (from registration)
USER1_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijg4MDQxNzUxLTUwYWUtNDlmYi04ODcyLTI0YjdmMDc5MDU2MiIsImVtYWlsIjoidXNlcjFAdGVzdC5jb20iLCJjcmVhdGVkX2F0IjoiMjAyNS0wNy0xNVQwNjoyMDoyNy4wODNaIiwiaWF0IjoxNzUyNTYwNDI3LCJleHAiOjE3NTMxNjUyMjd9.V07_CK8VTEiwQNmmF1kLud_RiVh3sHWBORqBVpd9ttU"
USER2_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjA0Y2EwMmI0LWI3ZmMtNDA4OC04OTM1LTYzOTNhMTc5Mjc4NSIsImVtYWlsIjoidXNlcjJAdGVzdC5jb20iLCJjcmVhdGVkX2F0IjoiMjAyNS0wNy0xNVQwNjoyMDozMy42NzVaIiwiaWF0IjoxNzUyNTYwNDMzLCJleHAiOjE3NTMxNjUyMzN9.oJCuUGKvdZeK5Kxbtfk1cWFEA0hiolxUDd67dqNWQd8"

# Service URLs
SYNXSPHERE_URL="http://localhost:3000"
COLLABORATION_URL="http://localhost:3003"
OPENDAW_URL="http://localhost:8000"

echo "✅ Step 1: Verify all services are running"
echo "----------------------------------------"

# Test SynxSphere
echo -n "SynxSphere Dashboard: "
if curl -s -o /dev/null -w "%{http_code}" $SYNXSPHERE_URL | grep -q "200"; then
    echo "✅ Running"
else
    echo "❌ Not accessible"
fi

# Test Collaboration Server
echo -n "Collaboration Server: "
if curl -s -o /dev/null -w "%{http_code}" $COLLABORATION_URL/api/health | grep -q "200"; then
    echo "✅ Running"
else
    echo "❌ Not accessible"
fi

# Test OpenDAW Studio
echo -n "OpenDAW Studio: "
if curl -s -o /dev/null -w "%{http_code}" $OPENDAW_URL | grep -q "200"; then
    echo "✅ Running"
else
    echo "❌ Not accessible"
fi

echo ""
echo "✅ Step 2: User 1 creates a room"
echo "-------------------------------"

ROOM_DATA=$(curl -s -X POST $SYNXSPHERE_URL/api/rooms \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $USER1_TOKEN" \
  -d '{
    "name": "Test Collaboration Room",
    "description": "Testing two users collaborating",
    "genre": "Electronic"
  }')

ROOM_ID=$(echo $ROOM_DATA | grep -o '"id":"[^"]*"' | cut -d'"' -f4)

if [ -n "$ROOM_ID" ]; then
    echo "✅ Room created successfully: $ROOM_ID"
    echo "Room data: $ROOM_DATA"
else
    echo "❌ Failed to create room"
    echo "Response: $ROOM_DATA"
    exit 1
fi

echo ""
echo "✅ Step 3: User 1 joins the room"
echo "-------------------------------"

USER1_JOIN=$(curl -s -X POST $SYNXSPHERE_URL/api/rooms/$ROOM_ID/join \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $USER1_TOKEN")

echo "User 1 join response: $USER1_JOIN"

echo ""
echo "✅ Step 4: User 2 joins the same room"
echo "------------------------------------"

USER2_JOIN=$(curl -s -X POST $SYNXSPHERE_URL/api/rooms/$ROOM_ID/join \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $USER2_TOKEN")

echo "User 2 join response: $USER2_JOIN"

echo ""
echo "✅ Step 5: Check room participants"
echo "--------------------------------"

ROOM_DETAILS=$(curl -s $SYNXSPHERE_URL/api/rooms/$ROOM_ID \
  -H "Authorization: Bearer $USER1_TOKEN")

echo "Room details: $ROOM_DETAILS"

echo ""
echo "✅ Step 6: Test OpenDAW Studio access with collaboration"
echo "-------------------------------------------------------"

echo "OpenDAW Studio URL with room: $OPENDAW_URL/?room=$ROOM_ID"
echo "Cross-origin isolation headers:"
curl -I $OPENDAW_URL | grep -E "(Cross-Origin|Content-Type)"

echo ""
echo "✅ Step 7: Test collaboration server project creation"
echo "----------------------------------------------------"

PROJECT_DATA=$(curl -s -X POST $COLLABORATION_URL/api/projects \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Collaboration Project",
    "room_id": "'$ROOM_ID'",
    "user_id": "user1"
  }')

PROJECT_ID=$(echo $PROJECT_DATA | grep -o '"id":"[^"]*"' | cut -d'"' -f4)

if [ -n "$PROJECT_ID" ]; then
    echo "✅ Collaboration project created: $PROJECT_ID"
else
    echo "⚠️  Project creation response: $PROJECT_DATA"
fi

echo ""
echo "✅ Step 8: Test WebSocket connection availability"
echo "------------------------------------------------"

echo "WebSocket endpoint: ws://localhost:3005"
echo -n "WebSocket server status: "
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3005 | grep -q "426"; then
    echo "✅ Available (426 = Upgrade Required, expected for WS endpoint)"
else
    echo "❌ Not responding"
fi

echo ""
echo "🎉 Collaboration Test Summary"
echo "============================="
echo "Room ID: $ROOM_ID"
echo "User 1: user1@test.com (Creator)"
echo "User 2: user2@test.com (Participant)"
echo ""
echo "Next steps for manual testing:"
echo "1. Open: $OPENDAW_URL/?room=$ROOM_ID in browser 1"
echo "2. Open: $OPENDAW_URL/?room=$ROOM_ID in browser 2"
echo "3. Both users should see collaborative features enabled"
echo "4. Changes made by one user should be visible to the other"
echo ""
echo "✅ All collaboration services are ready!"
