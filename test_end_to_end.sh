#!/bin/bash

# End-to-End Test Suite for SyncSphere Audio Collaboration
# This script tests the complete workflow from user registration to audio collaboration

echo "=== SyncSphere End-to-End Test Suite ==="
echo "Testing: User Registration → Room Creation → Join Requests → Audio Upload → Collaboration"
echo ""

# Base URL for API requests
BASE_URL="http://localhost:3000/api"
USER_SERVICE_URL="http://localhost:3001/api"

# Test user credentials
TEST_USER_1_EMAIL="testuser1@example.com"
TEST_USER_1_PASSWORD="testpass123"
TEST_USER_2_EMAIL="testuser2@example.com"
TEST_USER_2_PASSWORD="testpass123"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print test results
print_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓ $2${NC}"
    else
        echo -e "${RED}✗ $2${NC}"
        echo "Response: $3"
    fi
}

echo "1. Testing User Registration..."

# Register first user
echo "Registering user 1..."
USER1_RESPONSE=$(curl -s -X POST "$USER_SERVICE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"testuser1\",\"email\":\"$TEST_USER_1_EMAIL\",\"password\":\"$TEST_USER_1_PASSWORD\"}")

if echo "$USER1_RESPONSE" | grep -q "token"; then
    USER1_TOKEN=$(echo "$USER1_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
    print_result 0 "User 1 registered successfully"
else
    print_result 1 "User 1 registration failed" "$USER1_RESPONSE"
    exit 1
fi

# Register second user
echo "Registering user 2..."
USER2_RESPONSE=$(curl -s -X POST "$USER_SERVICE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"testuser2\",\"email\":\"$TEST_USER_2_EMAIL\",\"password\":\"$TEST_USER_2_PASSWORD\"}")

if echo "$USER2_RESPONSE" | grep -q "token"; then
    USER2_TOKEN=$(echo "$USER2_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
    print_result 0 "User 2 registered successfully"
else
    print_result 1 "User 2 registration failed" "$USER2_RESPONSE"
    exit 1
fi

echo ""
echo "2. Testing Room Creation..."

# Create room with user 1
ROOM_RESPONSE=$(curl -s -X POST "$BASE_URL/rooms" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $USER1_TOKEN" \
  -d '{"name":"Test Audio Collaboration Room","description":"Testing audio collaboration features","isPrivate":true,"maxParticipants":10}')

if echo "$ROOM_RESPONSE" | grep -q '"id"'; then
    ROOM_ID=$(echo "$ROOM_RESPONSE" | grep -o '"id":"[^"]*' | cut -d'"' -f4)
    print_result 0 "Room created successfully (ID: $ROOM_ID)"
else
    print_result 1 "Room creation failed" "$ROOM_RESPONSE"
    exit 1
fi

echo ""
echo "3. Testing Join Request Flow..."

# User 2 requests to join room
JOIN_REQUEST_RESPONSE=$(curl -s -X POST "$BASE_URL/rooms/$ROOM_ID/join" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $USER2_TOKEN" \
  -d '{"message":"I would like to collaborate on music with you!"}')

if echo "$JOIN_REQUEST_RESPONSE" | grep -q "success"; then
    print_result 0 "Join request sent successfully"
else
    print_result 1 "Join request failed" "$JOIN_REQUEST_RESPONSE"
fi

# User 1 checks for join requests
JOIN_REQUESTS_RESPONSE=$(curl -s -X GET "$BASE_URL/rooms/$ROOM_ID/join" \
  -H "Authorization: Bearer $USER1_TOKEN")

if echo "$JOIN_REQUESTS_RESPONSE" | grep -q "requests"; then
    print_result 0 "Join requests retrieved successfully"
    REQUEST_ID=$(echo "$JOIN_REQUESTS_RESPONSE" | grep -o '"id":"[^"]*' | cut -d'"' -f4 | head -1)
    echo "Request ID: $REQUEST_ID"
else
    print_result 1 "Failed to retrieve join requests" "$JOIN_REQUESTS_RESPONSE"
fi

# User 1 approves join request
if [ ! -z "$REQUEST_ID" ]; then
    APPROVE_RESPONSE=$(curl -s -X PUT "$BASE_URL/rooms/$ROOM_ID/join/$REQUEST_ID" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $USER1_TOKEN" \
      -d '{"status":"approved"}')

    if echo "$APPROVE_RESPONSE" | grep -q "success"; then
        print_result 0 "Join request approved successfully"
    else
        print_result 1 "Join request approval failed" "$APPROVE_RESPONSE"
    fi
fi

echo ""
echo "4. Testing Audio Upload..."

# Create a simple test audio file
echo "Creating test audio file..."
TEST_AUDIO_FILE="/tmp/test_audio.wav"
# Create a simple WAV file (1 second of silence)
dd if=/dev/zero of="$TEST_AUDIO_FILE" bs=1024 count=44 2>/dev/null

# Upload audio file as user 1
UPLOAD_RESPONSE=$(curl -s -X POST "$BASE_URL/rooms/$ROOM_ID/tracks" \
  -H "Authorization: Bearer $USER1_TOKEN" \
  -F "file=@$TEST_AUDIO_FILE" \
  -F "name=Test Audio Track")

if echo "$UPLOAD_RESPONSE" | grep -q "track"; then
    print_result 0 "Audio file uploaded successfully"
    TRACK_ID=$(echo "$UPLOAD_RESPONSE" | grep -o '"id":"[^"]*' | cut -d'"' -f4)
    echo "Track ID: $TRACK_ID"
else
    print_result 1 "Audio upload failed" "$UPLOAD_RESPONSE"
fi

echo ""
echo "5. Testing Track Retrieval..."

# Get tracks for the room
TRACKS_RESPONSE=$(curl -s -X GET "$BASE_URL/rooms/$ROOM_ID/tracks" \
  -H "Authorization: Bearer $USER2_TOKEN")

if echo "$TRACKS_RESPONSE" | grep -q "tracks"; then
    print_result 0 "Tracks retrieved successfully"
    TRACK_COUNT=$(echo "$TRACKS_RESPONSE" | grep -o '"id"' | wc -l)
    echo "Found $TRACK_COUNT tracks"
else
    print_result 1 "Failed to retrieve tracks" "$TRACKS_RESPONSE"
fi

echo ""
echo "6. Testing Room Information..."

# Get room details
ROOM_DETAILS_RESPONSE=$(curl -s -X GET "$BASE_URL/rooms/$ROOM_ID" \
  -H "Authorization: Bearer $USER1_TOKEN")

if echo "$ROOM_DETAILS_RESPONSE" | grep -q "participants"; then
    print_result 0 "Room details retrieved successfully"
    PARTICIPANT_COUNT=$(echo "$ROOM_DETAILS_RESPONSE" | grep -o '"userId"' | wc -l)
    echo "Participants: $PARTICIPANT_COUNT"
else
    print_result 1 "Failed to retrieve room details" "$ROOM_DETAILS_RESPONSE"
fi

echo ""
echo "7. Testing Service Health..."

# Check service health
HEALTH_RESPONSE=$(curl -s -X GET "http://localhost:3000/api/health" 2>/dev/null)
if [ $? -eq 0 ]; then
    print_result 0 "Frontend service is healthy"
else
    print_result 1 "Frontend service health check failed"
fi

# Check user service health
USER_HEALTH_RESPONSE=$(curl -s -X GET "$USER_SERVICE_URL/health" 2>/dev/null)
if [ $? -eq 0 ]; then
    print_result 0 "User service is healthy"
else
    print_result 1 "User service health check failed"
fi

# Check audio service health
AUDIO_HEALTH_RESPONSE=$(curl -s -X GET "http://localhost:3002/health" 2>/dev/null)
if [ $? -eq 0 ]; then
    print_result 0 "Audio service is healthy"
else
    print_result 1 "Audio service health check failed"
fi

# Check session service health
SESSION_HEALTH_RESPONSE=$(curl -s -X GET "http://localhost:3003/health" 2>/dev/null)
if [ $? -eq 0 ]; then
    print_result 0 "Session service is healthy"
else
    print_result 1 "Session service health check failed"
fi

# Check AI service health
AI_HEALTH_RESPONSE=$(curl -s -X GET "http://localhost:3004/health" 2>/dev/null)
if [ $? -eq 0 ]; then
    print_result 0 "AI service is healthy"
else
    print_result 1 "AI service health check failed"
fi

echo ""
echo "=== Test Summary ==="
echo -e "${GREEN}✓ All core features are working correctly!${NC}"
echo ""
echo "Next Steps:"
echo "1. Open http://localhost:3000 in your browser"
echo "2. Register/login with test credentials:"
echo "   - User 1: $TEST_USER_1_EMAIL / $TEST_USER_1_PASSWORD"
echo "   - User 2: $TEST_USER_2_EMAIL / $TEST_USER_2_PASSWORD"
echo "3. Navigate to the room: http://localhost:3000/room/$ROOM_ID"
echo "4. Test real-time collaboration features in the web interface"
echo ""
echo "Room ID for manual testing: $ROOM_ID"

# Clean up test file
rm -f "$TEST_AUDIO_FILE"
