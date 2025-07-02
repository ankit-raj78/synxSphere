#!/bin/bash

# Complete AI Service Test Suite with Integration Tests
# Runs unit tests, then starts service and runs integration tests

set -e

cd "$(dirname "$0")"

echo "🧪 Complete AI Service Test Suite"
echo "================================="

# Activate virtual environment
source venv/bin/activate
export PYTHONPATH="$(pwd)/src:$PYTHONPATH"
export TEST_MODE=true

echo "📦 Environment ready"
echo "🐍 Python: $(python --version)"

# Step 1: Run unit tests
echo ""
echo "1️⃣ Running unit tests..."
echo "-------------------------"

python -m pytest tests/test_health.py tests/test_audio.py tests/test_recommendations.py tests/test_database.py -v --tb=short

if [ $? -ne 0 ]; then
    echo "❌ Unit tests failed. Stopping test suite."
    exit 1
fi

echo "✅ Unit tests passed!"

# Step 2: Check if service is running
echo ""
echo "2️⃣ Checking AI service status..."
echo "-------------------------------"

SERVICE_RUNNING=false
if curl -s http://localhost:8004/health/ > /dev/null 2>&1; then
    echo "✅ AI service is already running"
    SERVICE_RUNNING=true
else
    echo "🚀 Starting AI service for integration tests..."
    
    # Start service in background
    ./start_ai_service.sh &
    SERVICE_PID=$!
    
    # Wait for service to start
    echo "⏳ Waiting for service to start..."
    for i in {1..30}; do
        if curl -s http://localhost:8004/health/ > /dev/null 2>&1; then
            echo "✅ AI service started successfully"
            SERVICE_RUNNING=true
            break
        fi
        sleep 1
        echo -n "."
    done
    echo ""
fi

if [ "$SERVICE_RUNNING" = false ]; then
    echo "❌ Could not start AI service. Skipping integration tests."
    exit 1
fi

# Step 3: Run integration tests
echo ""
echo "3️⃣ Running integration tests..."
echo "-------------------------------"

python -m pytest tests/test_integration.py -v -s

INTEGRATION_RESULT=$?

# Step 4: Cleanup
echo ""
echo "4️⃣ Cleanup..."
echo "-------------"

if [ -n "$SERVICE_PID" ]; then
    echo "🛑 Stopping AI service (PID: $SERVICE_PID)..."
    kill $SERVICE_PID 2>/dev/null || true
    wait $SERVICE_PID 2>/dev/null || true
    echo "✅ Service stopped"
fi

# Final results
echo ""
echo "📊 Test Results Summary"
echo "======================="

if [ $INTEGRATION_RESULT -eq 0 ]; then
    echo "✅ All tests passed!"
    echo ""
    echo "Test Coverage:"
    echo "  ✅ Health endpoints"
    echo "  ✅ Audio analysis"
    echo "  ✅ Recommendations"
    echo "  ✅ Database operations"
    echo "  ✅ Integration workflows"
    echo "  ✅ Performance benchmarks"
    echo ""
    echo "🎉 AI Service is ready for production!"
else
    echo "❌ Some integration tests failed"
    echo "💡 Check service logs and database connectivity"
    exit 1
fi
