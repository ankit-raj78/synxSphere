#!/bin/bash

# SynxSphere Quick Launch
# Just run: ./launch.sh

echo "🎵 Starting SynxSphere..."

# Start OpenDAW in background
npm run opendaw:start > /dev/null 2>&1 &

# Wait a moment
sleep 2

# Start React app (this will keep the terminal active)
echo "🚀 Launching React app..."
npm run dev
