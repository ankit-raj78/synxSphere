#!/bin/bash

# Simple test runner for SyncSphere AI Service
# Runs basic tests without complex coverage reporting

set -e

cd "$(dirname "$0")"

echo "🧪 Running SyncSphere AI Service Tests"
echo "====================================="

# Activate virtual environment
source venv/bin/activate

# Set environment variables for testing
export PYTHONPATH="$(pwd)/src:$PYTHONPATH"
export TEST_MODE=true

echo "📦 Environment ready"
echo "🐍 Python: $(python --version)"
echo "📍 Working directory: $(pwd)"

# Run tests with minimal output
echo ""
echo "🚀 Running tests..."

# First, test individual components
echo ""
echo "1️⃣ Testing health endpoints..."
python -m pytest tests/test_health.py -v

echo ""
echo "2️⃣ Testing audio analysis..."
python -m pytest tests/test_audio.py -v

echo ""
echo "3️⃣ Testing recommendations..."
python -m pytest tests/test_recommendations.py -v

echo ""
echo "4️⃣ Testing database operations..."
python -m pytest tests/test_database.py -v

echo ""
echo "✅ All tests completed successfully!"
