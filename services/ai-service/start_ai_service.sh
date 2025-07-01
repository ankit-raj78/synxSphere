#!/bin/bash

# SyncSphere AI Service Startup Script
# This script properly sets up the environment and starts the AI service

# Change to the AI service directory
cd "$(dirname "$0")"

# Set environment variables for testing if in CI
if [ "$CI" = "true" ] || [ "$NODE_ENV" = "test" ]; then
    export PORT=8004
    export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/syncsphere_test"
    echo "Starting AI service in test mode on port $PORT"
fi

# Set up Python path to include src directory
export PYTHONPATH="$(pwd)/src:$PYTHONPATH"

# For CI/testing: start in background
if [ "$1" = "--background" ] || [ "$CI" = "true" ]; then
    echo "Starting AI service in background..."
    cd src
    python main.py &
    AI_SERVICE_PID=$!
    echo $AI_SERVICE_PID > ../ai_service.pid
    
    # Wait for service to start
    sleep 5
    
    if kill -0 $AI_SERVICE_PID 2>/dev/null; then
        echo "AI Service started successfully with PID $AI_SERVICE_PID"
        exit 0
    else
        echo "Failed to start AI Service"
        exit 1
    fi
else
    # Normal startup
    cd src
    exec python main.py
fi
