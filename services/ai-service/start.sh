#!/bin/bash

# AI Service Development Startup Script

echo "🚀 Starting SyncSphere AI Service..."

# Clean up any existing cache files
echo "🧹 Cleaning Python cache files..."
find . -name "*.pyc" -delete 2>/dev/null || true
find . -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "📥 Installing dependencies..."
pip install -q fastapi uvicorn python-dotenv pydantic psutil python-multipart

# Optional: Install ML dependencies if requested
if [ "$1" = "--ml" ]; then
    echo "🧠 Installing ML dependencies..."
    pip install -q numpy librosa soundfile scikit-learn
fi

# Set environment to prevent .pyc file generation
export PYTHONDONTWRITEBYTECODE=1

# Start the service
echo "🎵 Starting AI Service on port 8004..."
python src/main.py
