#!/bin/bash

echo "🧪 Testing OpenDAW Collaboration MVP..."

# Test database connection
echo "📊 Testing database connection..."
if docker exec opendaw_collab_db psql -U opendaw -d opendaw_collab -c "SELECT 1;" >/dev/null 2>&1; then
    echo "✅ Database connection successful"
else
    echo "❌ Database connection failed"
    exit 1
fi

# Test WebSocket server
echo "🌐 Testing WebSocket server..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3003/ | grep -q "404\|200\|405"; then
    echo "✅ WebSocket server is responding"
else
    echo "❌ WebSocket server is not responding"
    exit 1
fi

# Show database tables
echo "📋 Database tables:"
docker exec opendaw_collab_db psql -U opendaw -d opendaw_collab -c "\dt"

echo ""
echo "🎯 All tests passed! System is ready for collaboration."
echo ""
echo "🚀 Next steps:"
echo "  1. Start OpenDAW: cd ../openDAW/studio && npm run dev"
echo "  2. Open browser windows with URLs:"
echo "     - User 1: http://localhost:5173?projectId=test&userId=alice&collaborative=true"
echo "     - User 2: http://localhost:5173?projectId=test&userId=bob&collaborative=true"
echo ""
echo "💡 You should see collaboration UI overlays and real-time synchronization!"
