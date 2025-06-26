#!/bin/bash

# SyncSphere AI Service Test Runner
# Runs all tests with coverage reporting

set -e  # Exit on any error

# Change to the AI service directory
cd "$(dirname "$0")"

echo "🧪 SyncSphere AI Service Test Suite"
echo "=================================="

# Activate virtual environment
echo "📦 Activating virtual environment..."
source venv/bin/activate

# Verify Python environment
echo "🐍 Python environment:"
echo "  Python: $(which python)"
echo "  Version: $(python --version)"

# Set PYTHONPATH to include src directory
export PYTHONPATH="$(pwd)/src:$PYTHONPATH"
echo "  PYTHONPATH: $PYTHONPATH"

# Install/verify test dependencies
echo ""
echo "📋 Checking test dependencies..."
pip install -q pytest pytest-asyncio pytest-cov httpx aiosqlite

# Run tests with different levels of detail
echo ""
echo "🧪 Running tests..."

# Basic test run
echo ""
echo "1️⃣ Quick test run (basic):"
pytest tests/ -v --tb=short

# Test with coverage
echo ""
echo "2️⃣ Test run with coverage:"
pytest tests/ --cov=src --cov-report=term-missing --cov-report=html

# Detailed test run for debugging
echo ""
echo "3️⃣ Detailed test run (for debugging):"
pytest tests/ -v -s --tb=long

echo ""
echo "✅ Test suite completed!"
echo ""
echo "📊 Coverage report generated in htmlcov/ directory"
echo "🔍 To view coverage report: open htmlcov/index.html"

# Show test summary
echo ""
echo "📈 Test Summary:"
echo "  - Health endpoints: ✓"
echo "  - Audio analysis: ✓"
echo "  - Recommendations: ✓"
echo "  - Database operations: ✓"
echo ""
echo "💡 Next steps:"
echo "  - Review coverage report"
echo "  - Add integration tests"
echo "  - Test with real database"
echo "  - Performance testing"
